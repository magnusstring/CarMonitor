# CarMonitor

A simple vehicle management app with reminders for insurance, inspection, and road tax.

## Tech Stack

- **Backend**: .NET 8 Web API
- **Frontend**: Angular 19 with Tailwind CSS
- **Data Storage**: Excel file (no database required)
- **Background Jobs**: Hangfire (for email reminders)

## Quick Start

### Prerequisites

- .NET 8 SDK
- Node.js 20+ and npm

### Backend

```bash
cd backend/CarMonitor.Api
dotnet run
```

The API will start at `https://localhost:5001` (or the port shown in console).
Swagger UI available at `/swagger` in development mode.

### Frontend

```bash
cd frontend/car-monitor
npm install
npm start
```

The app will start at `http://localhost:4200`.

## Features

- **Dashboard**: Overview of vehicles and upcoming reminders
- **Vehicles**: Add, edit, delete vehicles
- **Reminders**: Track insurance, inspection, and road tax due dates
- **Color-coded status**: Green (>30 days), Yellow (7-30 days), Red (<7 days), Gray (completed)
- **Email notifications**: Daily emails for reminders due within 7 days

## Configuration

### Email (for reminder notifications)

Edit `backend/CarMonitor.Api/appsettings.json`:

```json
{
  "Email": {
    "SmtpHost": "smtp.your-provider.com",
    "SmtpPort": 587,
    "SmtpUser": "your-email@example.com",
    "SmtpPass": "your-password",
    "FromEmail": "your-email@example.com",
    "FromName": "CarMonitor"
  }
}
```

### JWT Secret (for production)

Change the JWT key in `appsettings.json`:

```json
{
  "Jwt": {
    "Key": "YourSecureSecretKeyHere-AtLeast32Characters!"
  }
}
```

## Azure Deployment

### Build for Production

```bash
# Build Angular app
cd frontend/car-monitor
npm run build

# Copy to backend wwwroot
cp -r dist/car-monitor/browser/* ../backend/CarMonitor.Api/wwwroot/

# Publish backend
cd ../backend/CarMonitor.Api
dotnet publish -c Release -o ./publish
```

### Deploy to Azure App Service

1. Create an Azure App Service (Windows or Linux)
2. Deploy the `publish` folder contents
3. Configure App Settings:
   - `Jwt__Key`: Your secure JWT secret
   - `Email__SmtpHost`: SMTP server
   - `Email__SmtpUser`: SMTP username
   - `Email__SmtpPass`: SMTP password
   - `Email__FromEmail`: Sender email

### Data Storage

The Excel file (`carmonitor.xlsx`) is stored in the `Data` folder. In Azure:
- For App Service: stored in the app's file system
- For persistence: mount Azure File Storage or use Blob Storage

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register new user |
| GET | /api/dashboard | Get dashboard stats and reminders |
| GET | /api/vehicles | List all vehicles |
| POST | /api/vehicles | Create vehicle |
| GET | /api/vehicles/:id | Get vehicle details |
| PUT | /api/vehicles/:id | Update vehicle |
| DELETE | /api/vehicles/:id | Delete vehicle |
| GET | /api/reminders | List all reminders |
| POST | /api/reminders | Create reminder |
| PUT | /api/reminders/:id | Update reminder |
| PATCH | /api/reminders/:id/complete | Mark reminder complete |
| DELETE | /api/reminders/:id | Delete reminder |
