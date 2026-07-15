import os
import io
import asyncio
import hashlib
import logging
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
import firebase_admin
from firebase_admin import firestore

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from config import db

PAYMENT_BOT_TOKEN = os.getenv("PAYMENT_BOT_TOKEN")
ADMIN_BOT_TOKEN = os.getenv("ADMIN_BOT_TOKEN")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID", "8462274722"))
TELEBIRR_NUMBER = os.getenv("TELEBIRR_NUMBER", "+251911000000")
RATE_LIMIT_HOURS = 1
MAX_DEPOSITS_PER_HOUR = 3

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = user.id

    user_doc = db.collection("users").doc(str(user_id)).get()
    balance = 0
    play_wallet = 0
    if user_doc.exists:
        ud = user_doc.to_dict()
        balance = ud.get("balance", 0)
        play_wallet = ud.get("play_wallet", 0)

    text = (
        f"👋 Hello {user.first_name}!\n\n"
        f"💰 *Your Balances:*\n"
        f"   Main Wallet: *{balance:.2f} ETB*\n"
        f"   Play Wallet: *{play_wallet:.2f} ETB*\n\n"
        f"Choose what you want to do:"
    )

    keyboard = [
        [
            InlineKeyboardButton("💳 Deposit", callback_data="pay_deposit"),
            InlineKeyboardButton("💸 Withdraw", callback_data="pay_withdraw")
        ],
        [
            InlineKeyboardButton("💰 Balance", callback_data="pay_balance"),
            InlineKeyboardButton("📋 History", callback_data="pay_history")
        ],
        [
            InlineKeyboardButton("❓ Help", callback_data="pay_help")
        ]
    ]

    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user = query.from_user
    user_id = user.id
    data = query.data

    if data == "pay_deposit":
        await show_deposit_flow(query, user)

    elif data == "pay_withdraw":
        await show_withdraw_info(query)

    elif data == "pay_balance":
        user_doc = db.collection("users").doc(str(user_id)).get()
        balance = 0
        play_wallet = 0
        if user_doc.exists:
            ud = user_doc.to_dict()
            balance = ud.get("balance", 0)
            play_wallet = ud.get("play_wallet", 0)
        text = (
            f"💰 *Your Balances*\n\n"
            f"🏦 Main Wallet: *{balance:.2f} ETB*\n"
            f"🎮 Play Wallet: *{play_wallet:.2f} ETB*\n"
            f"💎 Total: *{balance + play_wallet:.2f} ETB*"
        )
        keyboard = [[InlineKeyboardButton("🔄 Refresh", callback_data="pay_balance")]]
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))

    elif data == "pay_history":
        deposits = db.collection("deposits").where("userId", "==", user_id).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(5).get()
        if not deposits:
            text = "📋 *No deposits found.*\n\nMake your first deposit to get started!"
        else:
            text = "📋 *Your Recent Deposits:*\n\n"
            for doc in deposits:
                d = doc.to_dict()
                emoji = {"pending": "⏳", "approved": "✅", "rejected": "❌"}.get(d.get("status", ""), "❓")
                amt = d.get("amount", 0)
                status = d.get("status", "unknown").upper()
                txn = d.get("transactionId", "N/A")
                text += f"{emoji} *{amt} ETB* — {status}\n   TXN: `{txn}`\n\n"
        keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="pay_main")]]
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))

    elif data == "pay_help":
        text = (
            "❓ *How to Deposit*\n\n"
            "1️⃣ Click *Deposit* below\n"
            "2️⃣ Send payment to TeleBirr: `+251911000000`\n"
            "3️⃣ Send the screenshot here\n"
            "4️⃣ Wait for admin approval\n\n"
            "✅ Balance updates automatically!\n\n"
            "📞 *Support:* @yegarabingobot"
        )
        keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="pay_main")]]
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))

    elif data == "pay_main":
        user_id = query.from_user.id
        db.collection("users").doc(str(user_id)).set({"awaiting_screenshot": False}, merge=True)
        user_doc = db.collection("users").doc(str(user_id)).get()
        balance = 0
        play_wallet = 0
        if user_doc.exists:
            ud = user_doc.to_dict()
            balance = ud.get("balance", 0)
            play_wallet = ud.get("play_wallet", 0)
        text = (
            f"👋 Hello {user.first_name}!\n\n"
            f"💰 *Your Balances:*\n"
            f"   Main Wallet: *{balance:.2f} ETB*\n"
            f"   Play Wallet: *{play_wallet:.2f} ETB*\n\n"
            f"Choose what you want to do:"
        )
        keyboard = [
            [
                InlineKeyboardButton("💳 Deposit", callback_data="pay_deposit"),
                InlineKeyboardButton("💸 Withdraw", callback_data="pay_withdraw")
            ],
            [
                InlineKeyboardButton("💰 Balance", callback_data="pay_balance"),
                InlineKeyboardButton("📋 History", callback_data="pay_history")
            ],
            [
                InlineKeyboardButton("❓ Help", callback_data="pay_help")
            ]
        ]
        try:
            await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))
        except Exception as e:
            logger.error(f"Error editing message: {e}")

    await query.answer()


async def show_deposit_flow(query, user):
    recent = db.collection("deposits").where("userId", "==", user.id).where("status", "==", "pending").get()
    pending_count = len(list(recent))
    if pending_count >= 3:
        await query.answer("You have too many pending deposits. Wait for approval.", show_alert=True)
        return

    text = (
        f"💳 *Deposit Process*\n\n"
        f"👤 *Name:* {user.first_name}\n"
        f"🆔 *User ID:* `{user.id}`\n\n"
        f"📱 *Send payment to:*\n"
        f"`{TELEBIRR_NUMBER}`\n\n"
        f"⚠️ *After paying:*\n"
        f"1. Take a screenshot of the receipt\n"
        f"2. Send the screenshot here\n"
        f"3. Wait for admin approval\n\n"
        f"⏳ Pending deposits: *{pending_count}/3*"
    )
    keyboard = [[InlineKeyboardButton("❌ Cancel", callback_data="pay_main")]]
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))
    context = query.bot  # store state differently
    # We set a flag on the user document
    db.collection("users").doc(str(query.from_user.id)).set(
        {"awaiting_screenshot": True}, merge=True
    )


async def show_withdraw_info(query):
    user_id = query.from_user.id
    user_doc = db.collection("users").doc(str(user_id)).get()
    balance = 0
    if user_doc.exists:
        balance = user_doc.to_dict().get("balance", 0)

    text = (
        f"💸 *Withdraw*\n\n"
        f"🏦 Main Wallet: *{balance:.2f} ETB*\n\n"
        f"To withdraw, use the *game app*:\n"
        f"1. Open Yegara Bingo\n"
        f"2. Go to Wallet\n"
        f"3. Click Withdraw\n"
        f"4. Enter amount + TeleBirr details\n\n"
        f"📞 Contact @yegarabingobot to play!"
    )
    keyboard = [[InlineKeyboardButton("🔙 Back", callback_data="pay_main")]]
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_screenshot(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user

    if not update.message.photo:
        await update.message.reply_text("❌ Please send a screenshot image, not text.")
        return

    user_doc = db.collection("users").doc(str(user.id)).get()
    if user_doc.exists and user_doc.to_dict().get("awaiting_screenshot"):
        pass
    else:
        await update.message.reply_text("💡 Send /start to begin a deposit, then send the screenshot.")
        return

    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    image_bytes = await file.download_as_bytearray()
    image_hash = hashlib.sha256(bytes(image_bytes)).hexdigest()

    deposits = db.collection("deposits").where("imageHash", "==", image_hash).get()
    if len(list(deposits)) > 0:
        await update.message.reply_text("❌ This screenshot was already used. Send a new one.")
        return

    await update.message.reply_text("🔍 Analyzing your screenshot...")

    extracted = await asyncio.to_thread(extract_text_from_image, bytes(image_bytes))

    if not extracted.get("transaction_id"):
        db.collection("users").doc(str(user.id)).set({"awaiting_screenshot": False}, merge=True)
        await update.message.reply_text(
            "❌ Could not read the screenshot.\n\n"
            "Make sure it shows:\n"
            "• Transaction ID\n"
            "• Amount\n"
            "• Your name\n\n"
            "Try again with /deposit"
        )
        return

    txn_id = extracted["transaction_id"]
    dup = db.collection("deposits").where("transactionId", "==", txn_id).get()
    if len(list(dup)) > 0:
        db.collection("users").doc(str(user.id)).set({"awaiting_screenshot": False}, merge=True)
        await update.message.reply_text(f"❌ Transaction `{txn_id}` already used.", parse_mode='Markdown')
        return

    deposit_data = {
        "userId": user.id,
        "username": user.username or "unknown",
        "firstName": user.first_name,
        "amount": extracted.get("amount", 0),
        "transactionId": txn_id,
        "senderName": extracted.get("sender_name", "Unknown"),
        "status": "pending",
        "imageHash": image_hash,
        "extractedText": extracted.get("raw_text", ""),
        "createdAt": datetime.utcnow(),
        "processedAt": None,
        "adminNote": ""
    }

    doc_ref = db.collection("deposits").add(deposit_data)
    deposit_id = doc_ref[1].id

    db.collection("users").doc(str(user.id)).set({"awaiting_screenshot": False}, merge=True)

    text = (
        f"✅ *Screenshot Received!*\n\n"
        f"💳 *Payment Details:*\n"
        f"• Amount: *{extracted.get('amount', 'Unknown')} ETB*\n"
        f"• Name: `{extracted.get('sender_name', 'Unknown')}`\n"
        f"• TXN: `{txn_id}`\n\n"
        f"⏳ *Waiting for admin approval...*\n"
        f"You'll be notified once processed.\n\n"
        f"Deposit ID: `{deposit_id}`"
    )
    await update.message.reply_text(text, parse_mode='Markdown')

    await notify_admin(deposit_data, deposit_id)


async def notify_admin(deposit_data, deposit_id):
    try:
        import httpx
        text = (
            f"💰 *New Deposit Request!*\n\n"
            f"👤 *User:* {deposit_data['firstName']} (@{deposit_data['username']})\n"
            f"🆔 *User ID:* `{deposit_data['userId']}`\n"
            f"💳 *Amount:* *{deposit_data.get('amount', 'Unknown')} ETB*\n"
            f"📝 *TXN:* `{deposit_data.get('transactionId', 'N/A')}`\n"
            f"👤 *Sender:* {deposit_data.get('senderName', 'Unknown')}\n"
            f"⏰ *Time:* {deposit_data['createdAt'].strftime('%Y-%m-%d %H:%M:%S')}"
        )
        keyboard = [[
            InlineKeyboardButton("✅ Approve", callback_data=f"approve_{deposit_id}"),
            InlineKeyboardButton("❌ Reject", callback_data=f"reject_{deposit_id}")
        ]]
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{ADMIN_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": ADMIN_CHAT_ID,
                    "text": text,
                    "parse_mode": "Markdown",
                    "reply_markup": {"inline_keyboard": keyboard}
                }
            )
    except Exception as e:
        logger.error(f"Failed to notify admin: {e}")


def extract_text_from_image(image_bytes):
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        result = {"raw_text": text}

        for pattern in [
            r'(?:Transaction\s*ID|TXN|Ref|Reference)[:\s]*([A-Z0-9]{8,})',
            r'(?:Transaction\s*ID|TXN|Ref|Reference)[:\s]*(\d{8,})',
            r'([A-Z0-9]{12,})',
        ]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["transaction_id"] = match.group(1)
                break

        for pattern in [
            r'(?:Amount|Total|ETB)[:\s]*([\d,.]+)',
            r'([\d,.]+)\s*ETB',
        ]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    result["amount"] = float(match.group(1).replace(",", ""))
                except ValueError:
                    pass
                break

        match = re.search(r'(?:From|Sender|Payer)[:\s]*([A-Za-z\s]+)', text, re.IGNORECASE)
        if match:
            result["sender_name"] = match.group(1).strip()

        return result
    except ImportError:
        return {"raw_text": "OCR not available", "transaction_id": None}
    except Exception as e:
        return {"raw_text": str(e), "transaction_id": None}


def main():
    app = Application.builder().token(PAYMENT_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("deposit", lambda u, c: start(u, c)))
    app.add_handler(CallbackQueryHandler(handle_callback, pattern="^pay_"))
    app.add_handler(MessageHandler(filters.PHOTO, handle_screenshot))
    logger.info("💳 Yegara Payment Bot starting...")
    app.run_polling()

if __name__ == "__main__":
    main()
