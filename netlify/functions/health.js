exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      status: 'healthy',
      app: 'probate-automation',
      timestamp: new Date().toISOString()
    })
  };
};
