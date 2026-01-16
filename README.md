# Canadian Grocery Index

A full-stack web application that tracks and visualizes Canadian grocery price trends using data from Statistics Canada. Built with Next.js, Express, TypeScript, and MongoDB.

![Canadian Grocery Index](https://img.shields.io/badge/Status-Active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.4-black)
![Express](https://img.shields.io/badge/Express-4.18-green)

## 🌟 Features

- **Price Tracking**: Monitor grocery prices across Canada with data from Statistics Canada
- **Price Trends**: Visualize month-over-month price changes with interactive charts
- **Top Gainers & Losers**: See which products have the biggest price increases or decreases
- **Price Streaks**: Track consecutive months of price increases or decreases
- **Year-over-Year Analysis**: Compare current prices to prices from one year ago
- **Product Search**: Search and explore individual product price histories
- **Regional Data**: View price data by geographic location (Canada, provinces, etc.)
- **Real-time Updates**: Automatic data synchronization with Statistics Canada API

## 🏗️ Tech Stack

### Frontend
- **Next.js 15.4** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **TypeScript** - Type safety

### Backend
- **Express.js** - REST API server
- **TypeScript** - Type-safe backend code
- **MongoDB** - Database for price data
- **Mongoose** - MongoDB ODM

### Data Pipeline
- **Python** - Data import script
- **Pandas** - Data processing
- **Statistics Canada API** - Data source

## 📁 Project Structure

```
grocery-index/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── app.ts          # Main Express application
│   │   └── routes/
│   │       └── statcan.ts  # API routes for StatCan data
│   ├── scripts/            # Utility scripts
│   │   ├── cache-warmup.js
│   │   └── process-data.js
│   └── package.json
├── react-frontend/         # Next.js frontend application
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── package.json
├── import-statcan-data.py  # Data import script
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0 (and < 21.0.0)
- **npm** >= 8.0.0
- **MongoDB** (local or cloud instance)
- **Python 3.x** (for data import script)
- **pip** packages: `pandas`, `pymongo`, `python-dotenv`, `requests`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grocery-index
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   ```

3. **Set up the frontend**
   ```bash
   cd ../react-frontend
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/statcan
   PORT=3000
   STATCAN_COLLECTION=table_18100245
   ```

   Create a `.env.local` file in the `react-frontend` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/statcan
   ```

5. **Import initial data**

   Install Python dependencies:
   ```bash
   pip install pandas pymongo python-dotenv requests
   ```

   Run the data import script:
   ```bash
   python download-table-1810024502.py
   ```

   This will:
   - Download the latest data from Statistics Canada
   - Extract and import it into MongoDB
   - Calculate price changes and streaks
   - Automatically clean up temporary files (extracted folder and downloaded ZIP)

6. **Start the development servers**

   Backend (from `backend` directory):
   ```bash
   npm run dev
   ```

   Frontend (from `react-frontend` directory):
   ```bash
   npm run dev
   ```

7. **Open your browser**

   - Frontend: http://localhost:5000
   - Backend API: http://localhost:3000/api/statcan

## 📚 API Documentation

### Endpoints

#### `GET /api/statcan`
Query price data with optional filters.

**Query Parameters:**
- `date` (optional): Date filter in YYYY-MM format
- `geo` (optional): Geographic location (e.g., "Canada", "Ontario")
- `product` (optional): Product name
- `limit` (optional): Maximum number of results (default: 10000)

**Example:**
```bash
GET /api/statcan?geo=Canada&product=Apples
```

#### `GET /api/statcan/price-changes`
Get top gainers and losers for a region.

**Query Parameters:**
- `geo` (required): Geographic location
- `limit` (optional): Number of top gainers/losers (default: 3)

**Example:**
```bash
GET /api/statcan/price-changes?geo=Canada&limit=5
```

#### `GET /api/statcan/streaks`
Get products with longest price increase/decrease streaks.

**Query Parameters:**
- `geo` (required): Geographic location
- `limit` (optional): Number of streaks to return (default: 3)

#### `GET /api/statcan/all-price-changes`
Get all products' price changes for a region, including 1-year change.

**Query Parameters:**
- `geo` (required): Geographic location

#### `GET /api/statcan/products`
Get all available product types.

#### `POST /api/statcan/calculate-changes`
Manually trigger price change calculation for a region.

**Body:**
```json
{
  "geo": "Canada"
}
```

## 🛠️ Development

### Backend Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm run warmup   # Warm up cache
```

### Frontend Scripts

```bash
npm run dev      # Start development server on port 5000
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Data Management

To update the database with the latest Statistics Canada data:

```bash
python import-statcan-data.py
```

The script will:
1. Download the latest data from Statistics Canada
2. Extract and import it into MongoDB
3. Calculate price changes and streaks automatically
4. Clean up temporary files (extracted folder and downloaded ZIP) automatically

**Note**: Temporary files are automatically removed after successful import. If the script encounters an error, temporary files may be kept for debugging purposes.

## 🚢 Deployment

### Backend Deployment

The backend can be deployed to any Node.js hosting service (Vercel, Railway, Heroku, etc.).

**Vercel:**
- Ensure `vercel.json` is configured
- Set environment variables in Vercel dashboard
- Deploy from the `backend` directory

### Frontend Deployment

The frontend is optimized for Vercel deployment.

**Vercel:**
- Connect your repository to Vercel
- Set environment variables
- Vercel will automatically detect Next.js and deploy

## 📊 Data Source

This application uses data from [Statistics Canada Table 18100245](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810024501), which provides monthly consumer price indexes for food purchased from stores.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Statistics Canada](https://www.statcan.gc.ca/) for providing the grocery price data
- Built with modern web technologies for optimal performance and user experience

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Note**: This project is for educational and informational purposes. Always verify important financial decisions with official sources.
