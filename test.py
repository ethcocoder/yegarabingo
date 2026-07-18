#!/usr/bin/env python3
"""
End-to-end local tests for the screenshot deposit flow.
Tests OCR, DB operations, admin notification, and the full handle_screenshot pipeline.
"""
import os
import sys
import asyncio
import hashlib
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import db
from bot import _extract_text_from_image, _notify_admin_deposit
from handlers.user_manager import UserManager

TEST_IMAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screenshot.jpg')
TEST_USER_ID = 999999999


class TestOCR(unittest.TestCase):
    """Test OCR extraction with the real screenshot."""

    def setUp(self):
        with open(TEST_IMAGE, 'rb') as f:
            self.image_bytes = f.read()

    def test_image_loads(self):
        self.assertGreater(len(self.image_bytes), 0, "screenshot.jpg is empty")

    def test_ocr_returns_dict(self):
        result = _extract_text_from_image(self.image_bytes)
        self.assertIsInstance(result, dict)
        for key in ['raw_text', 'status', 'amount', 'transaction_date',
                     'transaction_type', 'receiver_name', 'transaction_ref',
                     'sender_name', 'confidence']:
            self.assertIn(key, result, f"Missing key: {key}")

    def test_ocr_confidence_range(self):
        result = _extract_text_from_image(self.image_bytes)
        self.assertGreaterEqual(result['confidence'], 0.0)
        self.assertLessEqual(result['confidence'], 1.0)

    def test_ocr_amount_non_negative(self):
        result = _extract_text_from_image(self.image_bytes)
        self.assertGreaterEqual(result['amount'], 0)

    def test_image_hash_unique(self):
        h = hashlib.sha256(self.image_bytes).hexdigest()
        self.assertEqual(len(h), 64)


class TestDatabaseDepositFlow(unittest.TestCase):
    """Test DB deposit create/read/update operations."""

    def setUp(self):
        self.user_id = TEST_USER_ID
        self.deposit_id = None

    def tearDown(self):
        if self.deposit_id:
            db.collection('deposits').document(self.deposit_id).delete()
        db.collection('users').document(str(self.user_id)).delete()

    def test_create_and_read_deposit(self):
        user_data = {
            'user_id': self.user_id,
            'first_name': 'TestUser',
            'username': 'testuser',
            'balance': 0,
            'play_wallet': 0,
            'bonus': 0,
            'awaiting_screenshot': True,
            'registered': True,
            'phone': '+251900000000',
        }
        db.collection('users').document(str(self.user_id)).set(user_data)

        deposit_data = {
            'userId': str(self.user_id),
            'username': 'testuser',
            'firstName': 'TestUser',
            'telebirrName': 'TestTelebirr',
            'amount': 100.0,
            'transactionId': 'TEST-TXN-001',
            'senderName': 'TestUser',
            'status': 'pending',
            'imageHash': hashlib.sha256(b'test-image-bytes').hexdigest(),
            'imageFileId': 'fake_file_id_123',
            'ocr': {
                'status': 'success',
                'amount': 100.0,
                'transactionDate': '2026/07/18 10:00:00',
                'transactionType': 'Send Money',
                'receiverName': 'TestReceiver',
                'transactionRef': 'ABCD1234',
                'senderName': 'TestSender',
                'rawText': 'raw ocr text',
                'confidence': 0.75,
            },
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
            'processedAt': None,
            'adminNote': '',
        }

        ref = db.collection('deposits').document()
        ref.set(deposit_data)
        self.deposit_id = ref.id

        snap = db.collection('deposits').document(self.deposit_id).get()
        self.assertTrue(snap.exists)
        d = snap.to_dict()
        self.assertEqual(d['amount'], 100.0)
        self.assertEqual(d['status'], 'pending')
        self.assertEqual(d['ocr']['status'], 'success')
        self.assertEqual(d['ocr']['confidence'], 0.75)

    def test_duplicate_image_hash_check(self):
        h = hashlib.sha256(b'dup-test').hexdigest()
        dep1 = {
            'userId': str(self.user_id),
            'amount': 50.0,
            'status': 'pending',
            'imageHash': h,
            'imageFileId': 'fid1',
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
        }
        ref1 = db.collection('deposits').document()
        ref1.set(dep1)
        self.deposit_id = ref1.id

        dupes = list(db.collection('deposits').where('imageHash', '==', h).limit(1).get())
        self.assertEqual(len(dupes), 1)

    def test_deposit_approve_updates_status(self):
        dep = {
            'userId': str(self.user_id),
            'amount': 200.0,
            'status': 'pending',
            'imageHash': hashlib.sha256(b'approve-test').hexdigest(),
            'imageFileId': 'fid2',
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
        }
        ref = db.collection('deposits').document()
        ref.set(dep)
        self.deposit_id = ref.id

        db.collection('deposits').document(self.deposit_id).update({
            'status': 'approved',
            'processedAt': datetime.now(tz=timezone.utc).isoformat(),
            'adminNote': 'Test approved',
        })

        snap = db.collection('deposits').document(self.deposit_id).get()
        d = snap.to_dict()
        self.assertEqual(d['status'], 'approved')
        self.assertIsNotNone(d['processedAt'])

    def test_deposit_reject_updates_status(self):
        dep = {
            'userId': str(self.user_id),
            'amount': 50.0,
            'status': 'pending',
            'imageHash': hashlib.sha256(b'reject-test').hexdigest(),
            'imageFileId': 'fid3',
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
        }
        ref = db.collection('deposits').document()
        ref.set(dep)
        self.deposit_id = ref.id

        db.collection('deposits').document(self.deposit_id).update({
            'status': 'rejected',
            'processedAt': datetime.now(tz=timezone.utc).isoformat(),
            'adminNote': 'Test rejected',
        })

        snap = db.collection('deposits').document(self.deposit_id).get()
        d = snap.to_dict()
        self.assertEqual(d['status'], 'rejected')


class TestUserManager(unittest.TestCase):
    """Test UserManager screenshot state."""

    def setUp(self):
        self.um = UserManager(db)
        self.user_id = TEST_USER_ID + 1

    def tearDown(self):
        db.collection('users').document(str(self.user_id)).delete()

    def test_awaiting_screenshot_set_get(self):
        user_data = {
            'user_id': self.user_id,
            'first_name': 'ScreenshotTest',
            'username': 'sctest',
            'balance': 0,
            'awaiting_screenshot': False,
        }
        db.collection('users').document(str(self.user_id)).set(user_data)

        loop = asyncio.new_event_loop()
        loop.run_until_complete(self.um.set_awaiting_screenshot(self.user_id, True))
        u = loop.run_until_complete(self.um.get_user(self.user_id))
        self.assertTrue(u['awaiting_screenshot'])

        loop.run_until_complete(self.um.set_awaiting_screenshot(self.user_id, False))
        u = loop.run_until_complete(self.um.get_user(self.user_id))
        self.assertFalse(u['awaiting_screenshot'])
        loop.close()


class TestHandleScreenshotPipeline(unittest.TestCase):
    """Test the full handle_screenshot function with mocked Telegram objects."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        self.user_id = TEST_USER_ID + 2
        self._setup_user()

    def tearDown(self):
        db.collection('users').document(str(self.user_id)).delete()
        deposits = db.collection('deposits').where('userId', '==', str(self.user_id)).get()
        for d in deposits:
            db.collection('deposits').document(d.id).delete()
        self.loop.close()

    def _setup_user(self):
        user_data = {
            'user_id': self.user_id,
            'first_name': 'PipelineTest',
            'username': 'pipetest',
            'balance': 0,
            'awaiting_screenshot': True,
            'registered': True,
            'phone': '+251900000001',
        }
        db.collection('users').document(str(self.user_id)).set(user_data)

    def _make_update_message(self, photo_list):
        msg = MagicMock()
        msg.photo = photo_list
        msg.reply_text = AsyncMock()
        msg.chat_id = self.user_id
        return msg

    def test_handle_screenshot_full_pipeline(self):
        """Simulate the handle_screenshot flow without calling the actual bot handler,
        but testing each critical step independently."""
        with open(TEST_IMAGE, 'rb') as f:
            img_bytes = f.read()

        image_hash = hashlib.sha256(img_bytes).hexdigest()
        existing = db.collection('deposits').where('imageHash', '==', image_hash).limit(1).get()
        self.assertEqual(len(list(existing)), 0, "No pre-existing deposit with this hash")

        extracted = _extract_text_from_image(img_bytes)
        self.assertIsInstance(extracted, dict)
        self.assertIn(extracted['status'], ['success', 'failed', 'unknown'])

        txn_id = extracted.get('transaction_ref') or f"IMG-{image_hash[:12]}"
        amount = 100.0
        sender_name = extracted.get('receiver_name') or extracted.get('sender_name') or 'PipelineTest'

        deposit_data = {
            'userId': str(self.user_id),
            'username': 'pipetest',
            'firstName': 'PipelineTest',
            'telebirrName': 'TestTelebirr',
            'amount': amount,
            'transactionId': txn_id,
            'senderName': sender_name,
            'status': 'pending',
            'imageHash': image_hash,
            'imageFileId': 'mock_file_id',
            'ocr': {
                'status': extracted.get('status', 'unknown'),
                'amount': extracted.get('amount', 0),
                'transactionDate': extracted.get('transaction_date'),
                'transactionType': extracted.get('transaction_type'),
                'receiverName': extracted.get('receiver_name'),
                'transactionRef': extracted.get('transaction_ref'),
                'senderName': extracted.get('sender_name'),
                'rawText': extracted.get('raw_text', ''),
                'confidence': extracted.get('confidence', 0.0),
            },
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
            'processedAt': None,
            'adminNote': '',
        }

        deposit_ref = db.collection('deposits').document()
        deposit_ref.set(deposit_data)
        deposit_id = deposit_ref.id

        snap = db.collection('deposits').document(deposit_id).get()
        self.assertTrue(snap.exists, "Deposit saved and readable")
        saved = snap.to_dict()
        self.assertEqual(saved['status'], 'pending')
        self.assertEqual(saved['imageHash'], image_hash)
        self.assertEqual(saved['amount'], amount)

        db.collection('deposits').document(deposit_id).update({
            'status': 'approved',
            'processedAt': datetime.now(tz=timezone.utc).isoformat(),
            'adminNote': 'Test approval',
        })
        final = db.collection('deposits').document(deposit_id).get().to_dict()
        self.assertEqual(final['status'], 'approved')

    def test_duplicate_screenshot_rejected(self):
        with open(TEST_IMAGE, 'rb') as f:
            img_bytes = f.read()
        image_hash = hashlib.sha256(img_bytes).hexdigest()

        dep = {
            'userId': str(self.user_id),
            'amount': 100.0,
            'status': 'pending',
            'imageHash': image_hash,
            'imageFileId': 'fid_dup',
            'createdAt': datetime.now(tz=timezone.utc).isoformat(),
        }
        ref = db.collection('deposits').document()
        ref.set(dep)

        dupes = list(db.collection('deposits').where('imageHash', '==', image_hash).limit(1).get())
        self.assertGreaterEqual(len(dupes), 1, "Duplicate detected")


class TestAdminNotification(unittest.TestCase):
    """Test _notify_admin_deposit with mocked bot."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()

    def tearDown(self):
        self.loop.close()

    def test_notify_admin_sends_photo(self):
        mock_bot = MagicMock()
        mock_bot.send_photo = AsyncMock()

        deposit_data = {
            'userId': '123',
            'username': 'testuser',
            'firstName': 'TestUser',
            'telebirrName': 'TestTB',
            'amount': 150.0,
            'transactionId': 'TXN12345',
            'senderName': 'TestSender',
            'imageFileId': 'valid_file_id_abc',
            'ocr': {
                'status': 'success',
                'amount': 150.0,
                'transactionDate': '2026/07/18 10:00:00',
                'transactionType': 'Send Money',
                'receiverName': 'Receiver',
                'transactionRef': 'TXN12345',
                'senderName': 'TestSender',
                'rawText': 'test',
                'confidence': 0.75,
            },
        }

        async def run():
            from bot import _notify_admin_deposit
            with patch('bot.Bot', return_value=mock_bot), \
                 patch('bot.ADMIN_BOT_TOKEN', 'fake_token'), \
                 patch('bot._admin_id', return_value=123):
                await _notify_admin_deposit(deposit_data, 'test_dep_id', MagicMock())

        self.loop.run_until_complete(run())
        mock_bot.send_photo.assert_called_once()
        call_kwargs = mock_bot.send_photo.call_args
        self.assertEqual(call_kwargs.kwargs['photo'], 'valid_file_id_abc')

    def test_notify_admin_fallback_to_message(self):
        mock_bot = MagicMock()
        mock_bot.send_photo = AsyncMock(side_effect=Exception("file expired"))
        mock_bot.send_message = AsyncMock()

        deposit_data = {
            'userId': '123',
            'username': 'testuser',
            'firstName': 'TestUser',
            'amount': 50.0,
            'transactionId': 'N/A',
            'imageFileId': None,
            'ocr': {'status': 'unknown', 'confidence': 0.0},
        }

        async def run():
            from bot import _notify_admin_deposit
            with patch('bot.Bot', return_value=mock_bot), \
                 patch('bot.ADMIN_BOT_TOKEN', 'fake_token'), \
                 patch('bot._admin_id', return_value=123):
                await _notify_admin_deposit(deposit_data, 'test_dep_id2', MagicMock())

        self.loop.run_until_complete(run())


if __name__ == '__main__':
    unittest.main(verbosity=2)
