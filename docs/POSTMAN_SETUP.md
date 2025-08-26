# Postman Collection Automation

This project automatically exports and updates the Postman collection on every commit to keep API documentation in sync with code changes.

## Setup Instructions

### 1. Get Your Postman API Key

1. Go to [Postman API Keys](https://web.postman.co/settings/me/api-keys)
2. Click "Generate API Key"
3. Give it a name like "Empire Infratech Auto Export"
4. Copy the generated key

### 2. Get Your Collection ID

1. Open your collection in Postman
2. Click the three dots (⋯) next to your collection name
3. Select "Share"
4. Go to "Via API" tab
5. Copy the Collection ID from the URL (it's the long string after `/collections/`)

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
POSTMAN_API_KEY=your_actual_api_key_here
POSTMAN_COLLECTION_ID=your_actual_collection_id_here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Test the Export

```bash
npm run export-postman
```

If successful, you should see `docs/api-collection.json` created.

## How It Works

- **Pre-commit Hook**: Automatically exports your collection before each commit
- **Auto-staging**: The updated collection file is automatically added to your commit
- **Fallback**: If API keys aren't set, the commit continues without collection export

## Manual Export

You can manually export the collection anytime:

```bash
npm run export-postman
```

## Troubleshooting

### "API key required" error

- Make sure `POSTMAN_API_KEY` is set in your `.env` file
- Verify the API key is valid in Postman settings

### "Collection ID required" error

- Make sure `POSTMAN_COLLECTION_ID` is set in your `.env` file
- Double-check the collection ID from Postman's share dialog

### Collection not updating

- Verify you have write permissions to the collection in Postman
- Check that the collection ID matches your actual collection

## File Structure

```
docs/
├── api-collection.json     # Auto-generated Postman collection
└── POSTMAN_SETUP.md       # This setup guide

scripts/
└── export-postman.js      # Export script
```
