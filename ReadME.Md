# 🛒 Junk Deal - Yard Sale Cleanup Solution

Turn your yard sale clutter into cash with **Junk Deal**, a smart project management solution for organizing, pricing, and selling items from yard sales.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

- **📝 Quick Item Listing** - Easily add and categorize yard sale items
- **💰 Smart Pricing Suggestions** - Get AI-powered pricing recommendations
- **📧 Automated Email Notifications** - Send updates to interested buyers
- **📊 Sales Analytics** - Track sales data and generate reports
- **👨‍💼 Admin Dashboard** - Manage items and monitor sales in real-time
- **🔐 Secure Authentication** - JWT-based user authentication
- **📱 Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Dynamic functionality
- **GitHub Pages** - Free hosting

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Nodemailer** - Email service
- **Node-cron** - Task scheduling
- **CORS** - Cross-origin support
- **dotenv** - Environment variables

### Deployment
- **Frontend**: GitHub Pages
- **Backend**: Railway.app

## 📁 Project Structure

```
junk-deal/
├── frontend/
│   ├── index.html          # Main landing page
│   ├── admin.html          # Admin dashboard
│   ├── styles.css          # Styling
│   └── app.js              # Frontend logic
│
├── backend/
│   ├── package.json        # Dependencies
│   ├── server.js           # Express server
│   ├── database.js         # Database module
│   ├── emailService.js     # Email configuration
│   ├── scheduler.js        # Task scheduling
│   └── .env.example        # Environment template
│
��── README.md               # Project documentation
```

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/katiedayJunk1/yard-sale-cleanup.git
cd yard-sale-cleanup/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. **Start the server**
```bash
npm start        # Production
npm run dev      # Development with nodemon
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../frontend
```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Set source to `/frontend` branch
   - Your site will be available at `https://katiedayJunk1.github.io/yard-sale-cleanup`

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=junk_deal

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# JWT
JWT_SECRET=your_secret_key
```

### Email Configuration

Using Gmail:
1. Enable "Less secure app access" or use App Passwords
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add credentials to `.env`

## 💡 Usage

### Starting the Application

**Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Frontend:**
- Local: Open `frontend/index.html` in your browser
- Live: Visit `https://katiedayJunk1.github.io/yard-sale-cleanup`

### API Endpoints

- `GET /api/health` - Health check
- `GET /api` - API info

More endpoints coming soon!

## 🌐 Deployment

### Frontend (GitHub Pages)
- Automatically deployed from `/frontend` folder
- No additional setup required
- HTTPS enabled by default

### Backend (Railway)

1. **Create Railway account** - https://railway.app
2. **Connect GitHub repository**
3. **Set environment variables** in Railway dashboard
4. **Deploy** - Push to main branch for automatic deployment

## 📧 Email Notifications

The app sends automated emails for:
- Sale confirmations
- New item listings
- Weekly reports
- System alerts

Configure SMTP in `.env` for your email provider.

## 🔄 Scheduled Tasks

- **Daily Cleanup** (2 AM) - Archive completed sales
- **Weekly Report** (Monday 9 AM) - Generate sales reports

## 🐛 Troubleshooting

### Backend not starting?
```bash
# Check Node version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Email not sending?
- Verify `.env` credentials
- Check email provider's app password
- Allow "Less secure apps" if using Gmail

### CORS errors?
- Update `FRONTEND_URL` in `.env`
- Ensure frontend URL is in CORS whitelist

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing discussions
- Contact: katie.day@junkluggers.com

---

**Happy Selling! 🚀 Turn your junk into deals with Junk Deal!**
