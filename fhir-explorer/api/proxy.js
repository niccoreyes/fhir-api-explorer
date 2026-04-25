// Vercel Serverless Function for CORS proxy
// Optional: Use if FHIR servers block CORS

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        ...req.headers
      },
      body: req.method !== 'GET' ? req.body : undefined
    });

    const data = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
