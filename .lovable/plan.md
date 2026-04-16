
# Agentic Portfolio Management App

## Design
Dark, premium aesthetic inspired by Linear — dark backgrounds (#0F172A / slate-900), clean sans-serif typography, generous spacing, minimal chrome. Subtle borders, muted text for secondary info, accent color for interactive elements.

## Pages & Features

### 1. Authentication
- Login page with email/password and Google OAuth (via Supabase Auth)
- Clean centered card on dark background
- Redirect to main app after login

### 2. Main Layout (authenticated)
- Dark vertical sidebar on the left with app logo and "Portfolios" nav item
- Collapsible sidebar using shadcn Sidebar component
- Content area to the right

### 3. Portfolios Page (`/portfolios`)
- **Empty state** for new users: clean message with two action buttons
- **With portfolios**: grid of portfolio cards (rectangles) showing name, description, and summary stats — each clickable to navigate to portfolio detail
- Two buttons: **"Create from CSV"** and **"Create manually"**

### 4. Create from CSV Modal
- Fields: Portfolio name (required), Description (optional)
- Drag-and-drop zone for CSV upload (also clickable for file explorer)
- Fixed CSV template format: Ticker, Date, Price, Quantity, Fees
- Option to download a sample template

### 5. Create Manually Modal
- Stock name field with search/autocomplete (mock data)
- Date of purchase (date picker)
- Purchase price, Quantity, Fees fields
- Add multiple holdings before saving
- Portfolio name and description fields

### 6. Portfolio Detail Page (`/portfolios/$portfolioId`)
- **Line chart** at top (mock data) with 1D / 1M / 1Y toggle buttons
- **Holdings table** below with columns: Asset Name, ISIN, Quantity, Current Price, Purchase Price (Cost), Total Value, Perf 1D, Perf YTD
- All data is mock/demo for now

## Database (Supabase)
- `portfolios` table: id, user_id, name, description, created_at
- `holdings` table: id, portfolio_id, ticker, isin, name, purchase_date, purchase_price, quantity, fees, created_at
- RLS policies: users can only CRUD their own portfolios and holdings
- Profiles table for user data with auto-create trigger on signup

## Tech Stack
- TanStack Start with file-based routing
- Supabase for auth (email/password + Google OAuth) and database
- shadcn/ui components (Sidebar, Dialog, Card, Table, Button, Input)
- Recharts for the financial line chart
- Papa Parse for CSV parsing
- Dark theme by default
