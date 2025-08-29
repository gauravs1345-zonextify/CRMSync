import fetch from 'node-fetch';

console.log("🔄 Zoho sync started at", new Date().toISOString());

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function runSync() {
  try {
    const response = await fetch('https://car-app-puce-one.vercel.app/listings');
    const data = await response.json();

    console.log("📦 Total listings fetched:", data.length);

    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(now.getDate() - 1);

    const zohoPayloads = [];

    data.forEach(item => {
      const timestamp = item["Processing timestamp"];
      if (!timestamp) return;

      const itemDate = new Date(timestamp * 1000);
      if (itemDate >= oneDayAgo && itemDate <= now) {
        const mapped = {
          Listing_Title: item["Listing title"],
          Company: item["Company/Dealer name"],
          ContactName: item["Contact person name"],
          Phone: item["Phone"],
          Email_addresses: item["Email addresses"],
          City: item["City"],
          Country: item["Country"],
          SellerAddres: item["Seller address"],
          id: item["_id"],
          CreatedTime: itemDate.toISOString(),
          Make: item["Make"],
          Model: item["Model"],
          Variant: item["Variant/Trim"],
          Model_Year: item["Model year"],
          Mileage_km: item["Mileage (km)"],
          Exterior_Color: item["Exterior color"],
          Horsepower: item["Horsepower"],
          Main_Price: item["Main price"],
          Currency: item["Currency"],
          Seller_Type: item["Seller type"],
          Dealer_Name: item["Company/Dealer name"],
          Source_URL: item["Source URL"],
          Main_Image: item["mainImage"],
          Listing_Date: itemDate.toISOString().split('T')[0],
          Options: Array.isArray(item["Options list"]) ? item["Options list"].join(", ") : "",
          Images: Array.isArray(item["images"]) ? item["images"].join(", ") : ""
        };

        zohoPayloads.push(mapped);
      }
    });

    console.log(`✅ Prepared ${zohoPayloads.length} listings for Zoho CRM`);

    const batches = chunkArray(zohoPayloads, 50);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const zohoResponse = await fetch('https://www.zohoapis.eu/crm/v7/functions/getmongodb_data/actions/execute?auth_type=apikey&zapikey=1003.b5548ba22119b0ba123c552679cd05ed.6c1cc7eba1040e39975ca3adf0986fa6', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '_zcsr_tmp=4c5ddb36-bc5c-4e32-a63c-f6d2c50eb13f; crmcsr=4c5ddb36-bc5c-4e32-a63c-f6d2c50eb13f'
        },
        body: JSON.stringify({ data: batch })
      });

      const result = await zohoResponse.text();
      console.log(`📤 Batch ${i + 1} response:`, result);
    }

    console.log("✅ Sync complete. Total listings synced:", zohoPayloads.length);

  } catch (err) {
    console.error("❌ Sync failed:", err.message);
  }
}

runSync();
