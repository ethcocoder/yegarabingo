import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from config import db

ADMIN_BOT_TOKEN = os.getenv("ADMIN_BOT_TOKEN", "YOUR_ADMIN_BOT_TOKEN_HERE")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_CHAT_ID", "0"))
PAYMENT_BOT_TOKEN = os.getenv("PAYMENT_BOT_TOKEN", "YOUR_PAYMENT_BOT_TOKEN_HERE")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        await update.message.reply_text("⛔ Unauthorized. This bot is for admins only.")
        return

    text = """🔧 *Yegara Admin Bot*

*Commands:*
/deposits - View pending deposits
/withdrawals - View pending withdrawals
/stats - System statistics
/games - Active games (control wins)

*Quick Actions:*
/deposit_queue - Show deposit queue
/withdraw_queue - Show withdrawal queue"""

    await update.message.reply_text(text, parse_mode='Markdown')

async def deposits(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return

    pending = db.collection("deposits").where("status", "==", "pending").order_by("createdAt").get()

    if not pending:
        await update.message.reply_text("✅ No pending deposits.")
        return

    text = "📋 *Pending Deposits:*\n\n"
    for doc in pending:
        d = doc.to_dict()
        text += f"🆔 `{doc.id}`\n"
        text += f"👤 {d.get('firstName', 'Unknown')} (@{d.get('username', 'unknown')})\n"
        text += f"💰 {d.get('amount', 0)} ETB\n"
        text += f"📝 TXN: `{d.get('transactionId', 'N/A')}`\n"
        created = d.get('createdAt')
        if created and hasattr(created, 'strftime'):
            text += f"⏰ {created.strftime('%Y-%m-%d %H:%M')}\n\n"
        else:
            text += f"⏰ Unknown\n\n"

    await update.message.reply_text(text, parse_mode='Markdown')

async def withdrawals(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return

    pending = db.collection("withdrawals").where("status", "==", "pending").order_by("createdAt").get()

    if not pending:
        await update.message.reply_text("✅ No pending withdrawals.")
        return

    text = "📋 *Pending Withdrawals:*\n\n"
    for doc in pending:
        w = doc.to_dict()
        text += f"🆔 `{doc.id}`\n"
        text += f"👤 {w.get('firstName', 'Unknown')} (@{w.get('username', 'unknown')})\n"
        text += f"💰 {w.get('amount', 0)} ETB\n"
        text += f"📱 TeleBirr: `{w.get('telebirrNumber', 'N/A')}`\n"
        created = w.get('createdAt')
        if created and hasattr(created, 'strftime'):
            text += f"⏰ {created.strftime('%Y-%m-%d %H:%M')}\n\n"
        else:
            text += f"⏰ Unknown\n\n"

    await update.message.reply_text(text, parse_mode='Markdown')

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return

    users = len(list(db.collection("users").get()))
    games = len(list(db.collection("games").get()))
    pending_deposits = len(list(db.collection("deposits").where("status", "==", "pending").get()))
    pending_withdrawals = len(list(db.collection("withdrawals").where("status", "==", "pending").get()))
    total_deposited = sum(d.to_dict().get("amount", 0) for d in db.collection("deposits").where("status", "==", "approved").get())
    total_withdrawn = sum(w.to_dict().get("amount", 0) for w in db.collection("withdrawals").where("status", "==", "approved").get())

    text = f"""📊 *System Statistics*

👥 *Users:* {users}
🎮 *Games:* {games}
💰 *Pending Deposits:* {pending_deposits}
💸 *Pending Withdrawals:* {pending_withdrawals}
📈 *Total Deposited:* {total_deposited:.2f} ETB
📉 *Total Withdrawn:* {total_withdrawn:.2f} ETB
💵 *Net Balance:* {total_deposited - total_withdrawn:.2f} ETB"""

    await update.message.reply_text(text, parse_mode='Markdown')

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query

    if update.effective_user.id != ADMIN_CHAT_ID:
        await query.answer("⛔ Unauthorized.", show_alert=True)
        return

    await query.answer()
    data = query.data

    if data.startswith("approve_") and not data.startswith("approve_withdraw_"):
        deposit_id = data.replace("approve_", "")
        await process_deposit(deposit_id, "approved", query)

    elif data.startswith("reject_") and not data.startswith("reject_withdraw_"):
        deposit_id = data.replace("reject_", "")
        await process_deposit(deposit_id, "rejected", query)

    elif data.startswith("approve_withdraw_"):
        withdraw_id = data.replace("approve_withdraw_", "")
        await process_withdrawal(withdraw_id, "approved", query)

    elif data.startswith("reject_withdraw_"):
        withdraw_id = data.replace("reject_withdraw_", "")
        await process_withdrawal(withdraw_id, "rejected", query)

    elif data.startswith("allow_win_"):
        game_id = data.replace("allow_win_", "")
        await handle_game_control(game_id, "allow", query, context)

    elif data.startswith("random_win_"):
        game_id = data.replace("random_win_", "")
        await handle_game_control(game_id, "random", query, context)

    elif data.startswith("block_win_"):
        game_id = data.replace("block_win_", "")
        await handle_game_control(game_id, "block", query, context)


async def handle_game_control(game_id, action, query, context):
    try:
        game_ref = db.collection("games").document(game_id)
        game_doc = game_ref.get()

        if not game_doc.exists:
            await query.answer("❌ Game not found", show_alert=True)
            return

        game = game_doc.to_dict()
        if game.get("status") != "active":
            await query.answer("⚠️ Game is no longer active", show_alert=True)
            return

        user_name = "Unknown"
        user_id = game.get("user_id")
        if user_id:
            user_doc = db.collection("users").doc(str(user_id)).get()
            if user_doc.exists:
                u = user_doc.to_dict()
                user_name = f"{u.get('first_name', 'Unknown')} (@{u.get('username', 'unknown')})"

        called_count = len(game.get("called_numbers", []))
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        updates = {
            "admin_action": {
                "type": action,
                "source": "bot",
                "timestamp": datetime.utcnow(),
                "admin_id": ADMIN_CHAT_ID
            }
        }

        if action == "allow":
            updates["allow_win"] = True
            updates["win_user_id"] = str(user_id)
            confirm_text = (
                f"✅ *WIN ALLOWED*\n\n"
                f"👤 Player: {user_name}\n"
                f"💰 Stake: {game.get('stake', 0)} ETB\n"
                f"📊 Numbers called: {called_count}/75\n"
                f"🕐 {now_str}\n\n"
                f"The player will now receive winning numbers.\n"
                f"When they complete a line → they WIN!"
            )

        elif action == "random":
            random_ref = db.collection("games").where("status", "==", "completed").where("win_user_id", "==", "random")
            random_docs = list(random_ref.stream())
            random_win_count = sum(1 for d in random_docs if d.to_dict().get("winner"))
            if random_win_count >= 2:
                await query.answer(
                    "Max 2 random winners reached! Use Allow Win for a specific player.",
                    show_alert=True,
                )
                return
            updates["allow_win"] = True
            updates["win_user_id"] = "random"
            confirm_text = (
                f"🎲 *RANDOM WIN*\n\n"
                f"👤 Player: {user_name}\n"
                f"💰 Stake: {game.get('stake', 0)} ETB\n"
                f"📊 Numbers called: {called_count}/75\n"
                f"🕐 {now_str}\n"
                f"🏆 Random winners: {random_win_count + 1}/2\n\n"
                f"A random winning number will be called.\n"
                f"Good luck to the player!"
            )

        elif action == "block":
            updates["allow_win"] = False
            updates["win_user_id"] = None
            confirm_text = (
                f"❌ *WINS BLOCKED*\n\n"
                f"👤 Player: {user_name}\n"
                f"💰 Stake: {game.get('stake', 0)} ETB\n"
                f"📊 Numbers called: {called_count}/75\n"
                f"🕐 {now_str}\n\n"
                f"No winning numbers will be called.\n"
                f"The game will end with no winner."
            )

        game_ref.update(updates)

        try:
            await query.edit_message_text(
                f"{'✅' if action == 'allow' else '🎲' if action == 'random' else '❌'} "
                f"*{action.upper()}* — Done at {now_str}\n"
                f"👤 {user_name}\n"
                f"💰 {game.get('stake', 0)} ETB"
                f"\n\n_Bot and Dashboard are now synced._",
                parse_mode='Markdown'
            )
        except Exception:
            pass

        try:
            await context.bot.send_message(
                chat_id=ADMIN_CHAT_ID,
                text=confirm_text,
                parse_mode='Markdown'
            )
        except Exception:
            pass

        logger.info(f"Game {game_id} control: {action} by admin via bot")

    except Exception as e:
        logger.error(f"Error controlling game: {e}")
        await query.answer(f"❌ Error: {str(e)[:100]}", show_alert=True)

async def process_deposit(deposit_id, status, query):
    try:
        doc_ref = db.collection("deposits").document(deposit_id)
        doc = doc_ref.get()

        if not doc.exists:
            await query.edit_message_text("❌ Deposit not found.")
            return

        deposit = doc.to_dict()

        if deposit.get("status") != "pending":
            await query.edit_message_text(f"⚠️ Deposit already {deposit.get('status')}.")
            return

        doc_ref.update({
            "status": status,
            "processedAt": datetime.utcnow()
        })

        if status == "approved":
            user_id = deposit.get("userId")
            amount = deposit.get("amount", 0)

            user_ref = db.collection("users").document(str(user_id))
            user_doc = user_ref.get()

            current_balance = 0
            if user_doc.exists:
                current_balance = user_doc.to_dict().get("balance", 0)
                user_ref.update({
                    "balance": current_balance + amount,
                    "updatedAt": datetime.utcnow()
                })

            new_balance = current_balance + amount
            await notify_user(user_id, f"✅ *Deposit Approved*\n\n+{amount} ETB added to your balance.\nNew Balance: {new_balance:.2f} ETB")

            await query.edit_message_text(
                f"✅ *Deposit Approved*\n\n"
                f"User: {deposit.get('firstName', 'Unknown')}\n"
                f"Amount: {deposit.get('amount', 0)} ETB\n"
                f"Balance credited automatically."
            )
        else:
            await notify_user(deposit.get("userId"), f"❌ *Deposit Rejected*\n\nYour deposit of {deposit.get('amount', 0)} ETB was rejected.\nPlease contact admin if you believe this is an error.")

            await query.edit_message_text(
                f"❌ *Deposit Rejected*\n\n"
                f"User: {deposit.get('firstName', 'Unknown')}\n"
                f"Amount: {deposit.get('amount', 0)} ETB"
            )

    except Exception as e:
        logger.error(f"Error processing deposit: {e}")
        await query.edit_message_text(f"❌ Error: {str(e)}")

async def process_withdrawal(withdraw_id, status, query):
    try:
        doc_ref = db.collection("withdrawals").document(withdraw_id)
        doc = doc_ref.get()

        if not doc.exists:
            await query.edit_message_text("❌ Withdrawal not found.")
            return

        withdrawal = doc.to_dict()

        if withdrawal.get("status") != "pending":
            await query.edit_message_text(f"⚠️ Withdrawal already {withdrawal.get('status')}.")
            return

        doc_ref.update({
            "status": status,
            "processedAt": datetime.utcnow()
        })

        if status == "approved":
            await notify_user(withdrawal.get("userId"), f"✅ *Withdrawal Approved*\n\n{withdrawal.get('amount', 0)} ETB will be sent to your TeleBirr.\nPlease allow up to 24 hours.")

            await query.edit_message_text(
                f"✅ *Withdrawal Approved*\n\n"
                f"User: {withdrawal.get('firstName', 'Unknown')}\n"
                f"Amount: {withdrawal.get('amount', 0)} ETB\n"
                f"TeleBirr: {withdrawal.get('telebirrNumber', 'N/A')}\n\n"
                f"📱 *Send {withdrawal.get('amount', 0)} ETB to:*\n`{withdrawal.get('telebirrNumber', 'N/A')}`"
            )
        else:
            user_id = withdrawal.get("userId")
            amount = withdrawal.get("amount", 0)
            user_ref = db.collection("users").document(str(user_id))
            user_doc = user_ref.get()
            current_balance = 0
            if user_doc.exists:
                current_balance = user_doc.to_dict().get("balance", 0)
                user_ref.update({"balance": current_balance + amount, "updatedAt": datetime.utcnow()})

            await notify_user(user_id, f"❌ *Withdrawal Rejected*\n\nYour withdrawal of {amount} ETB was rejected.\n{amount} ETB has been refunded to your balance.")

            await query.edit_message_text(
                f"❌ *Withdrawal Rejected*\n\n"
                f"User: {withdrawal.get('firstName', 'Unknown')}\n"
                f"Amount: {withdrawal.get('amount', 0)} ETB\n"
                f"Balance refunded."
            )

    except Exception as e:
        logger.error(f"Error processing withdrawal: {e}")
        await query.edit_message_text(f"❌ Error: {str(e)}")

async def notify_user(user_id, text):
    try:
        from telegram import Bot
        bot = Bot(token=PAYMENT_BOT_TOKEN)
        await bot.send_message(chat_id=user_id, text=text, parse_mode='Markdown')
    except Exception as e:
        logger.error(f"Failed to notify user {user_id}: {e}")

async def deposit_queue(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return
    await deposits(update, context)

async def withdraw_queue(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return
    await withdrawals(update, context)

async def active_games(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_CHAT_ID:
        return

    games = db.collection("games").where("status", "==", "active").get()

    if not games:
        await update.message.reply_text("✅ No active games.")
        return

    for doc in games:
        g = doc.to_dict()
        user_id = g.get("user_id")
        user_name = "Unknown"
        if user_id:
            user_doc = db.collection("users").doc(str(user_id)).get()
            if user_doc.exists:
                u = user_doc.to_dict()
                user_name = f"{u.get('first_name', 'Unknown')} (@{u.get('username', 'unknown')})"

        allow = "✅ Allowed" if g.get("allow_win") else "❌ Blocked"
        called_count = len(g.get("called_numbers", []))

        admin_action = g.get("admin_action")
        action_info = ""
        if admin_action:
            action_type = admin_action.get("type", "unknown")
            action_source = admin_action.get("source", "unknown")
            action_time = admin_action.get("timestamp")
            time_str = action_time.strftime('%H:%M:%S') if action_time and hasattr(action_time, 'strftime') else "unknown"
            action_type_label = {"allow": "✅ Allowed", "block": "❌ Blocked", "random": "🎲 Random"}.get(action_type, action_type)
            action_info = f"\n📋 *Last Admin Action:*\n   {action_type_label} via {action_source} at {time_str}"

        keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("✅ Allow Win", callback_data=f"allow_win_{doc.id}"),
                InlineKeyboardButton("🎲 Random", callback_data=f"random_win_{doc.id}")
            ],
            [
                InlineKeyboardButton("❌ Block All", callback_data=f"block_win_{doc.id}")
            ]
        ])

        text = f"🎮 *Active Game*\n\n👤 {user_name}\n💰 Stake: {g.get('stake', 0)} ETB\n📊 Numbers called: {called_count}/75\n🎯 Win status: {allow}{action_info}"

        await update.message.reply_text(text, parse_mode='Markdown', reply_markup=keyboard)

def main():
    app = Application.builder().token(ADMIN_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("deposits", deposits))
    app.add_handler(CommandHandler("withdrawals", withdrawals))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("games", active_games))
    app.add_handler(CommandHandler("deposit_queue", deposit_queue))
    app.add_handler(CommandHandler("withdraw_queue", withdraw_queue))
    app.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("🔧 Yegara Admin Bot is starting...")
    app.run_polling()

if __name__ == "__main__":
    main()
