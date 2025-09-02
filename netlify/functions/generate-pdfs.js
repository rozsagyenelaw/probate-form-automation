exports.handler = async (event, context) => {
  console.log('Function triggered!');
  console.log('Request method:', event.httpMethod);
  console.log('Request body:', event.body);
  
  try {
    const data = JSON.parse(event.body);
    console.log('Parsed data:', JSON.stringify(data, null, 2));
    
    // Rest of your existing code...
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const data = JSON.parse(event.body);
    
    // Transform the data with default values
    const formData = {
      attorney: {
        name: data.attorney_name || "ROZSA GYENE, ESQ.",
        bar_number: "208356",
        firm_name: "LAW OFFICES OF ROZSA GYENE",
        street: "450 N BRAND BLVD SUITE 600",
        city: "GLENDALE",
        state: "CA",
        zip: "91203",
        phone: "818-291-6217",
        email: "ROZSAGYENELAW@YAHOO.COM",
      },
      decedent: {
        name: data.decedent_name || "Unknown",
        death_date: data.death_date || "",
        death_place: data.death_place || "",
      },
      petitioner: {
        name: data.petitioner_name || "Unknown",
        relationship: data.petitioner_relationship || "",
      },
      estate: {
        has_will: data.has_will === "yes",
        personal_property: data.personal_property_value || "0",
      }
    };
    
    // For now, return the transformed data to verify it works
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Data received and transformed',
        data: formData
      }),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process',
        details: error.message 
      }),
    };
  }
};
