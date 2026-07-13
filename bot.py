import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from config import BOT_TOKEN, db, DEFAULT_STAKE_10, DEFAULT_STAKE_20
from game.engine import GameEngine
from game.prediction import PredictionAlgorithm
from handlers.user_manager import UserManager
from handlers.admin_handlers import AdminHandlers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

game_engine = GameEngine(db)
prediction = PredictionAlgorithm(db)
user_manager = UserManager(db)
admin_handlers = AdminHandlers(db, game_engine, prediction)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_data = await user_manager.get_or_create_user(user.id, user.first_name, user.username)
    
    keyboard = [
        [InlineKeyboardButton(f"🎮 Play 10 ETB", callback_data="stake_10")],
        [InlineKeyboardButton(f"🎮 Play 20 ETB", callback_data="stake_20")],
        [InlineKeyboardButton("📋 History", callback_data="history"),
         InlineKeyboardButton("💰 Wallet", callback_data="wallet")],
        [InlineKeyboardButton("👤 Profile", callback_data="profile")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    stats = await game_engine.get_stats()
    
    text = f"""🎲 *Welcome to Yegara Bingo!*

👋 Hello {user.first_name}!

💰 Your Balance: *{user_data.get('balance', 0)} ETB*

📊 *Game Stats:*
• Active Players: {stats['active_players']}
• Games Played: {stats['games_played']}
• Winners Today: {stats['winners_today']}

Choose your stake to start playing!"""
    
    await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='Markdown')

async def handle_stake(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    stake = DEFAULT_STAKE_10 if query.data == "stake_10" else DEFAULT_STAKE_20
    user_id = query.from_user.id
    
    user_data = await user_manager.get_user(user_id)
    if user_data.get('balance', 0) < stake:
        await query.edit_message_text("❌ Insufficient balance! Please add funds to your wallet.")
        return
    
    # Create game session
    game_session = await game_engine.create_game(user_id, stake)
    cartela = await game_engine.generate_cartela()
    
    # Deduct stake
    await user_manager.deduct_balance(user_id, stake)
    
    # Build game board
    board_text = game_engine.format_game_board(cartela, [], stake, user_data.get('play_wallet', 0))
    
    keyboard = [
        [InlineKeyboardButton("🔙 Back", callback_data="back_home"),
         InlineKeyboardButton("🔄 Refresh", callback_data="refresh_game")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(board_text, reply_markup=reply_markup, parse_mode='Markdown')

async def main():
    app = Application.builder().token(BOT_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(handle_stake, pattern="^stake_"))
    app.add_handler(admin_handlers.get_handler())
    
    logger.info("🎯 Yegara Bingo Bot is starting...")
    await app.run_polling()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
