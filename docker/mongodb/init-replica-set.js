const config = { _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017', priority: 1 }] };
try {
  const status = rs.status();
  if (status.ok !== 1) throw new Error('Replica set is not ready');
  print('Replica set already initialized');
} catch (error) {
  if (error.codeName === 'NotYetInitialized' || String(error).includes('no replset config')) {
    rs.initiate(config);
    print('Replica set initialized');
  } else {
    throw error;
  }
}
let ready = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    if (rs.status().myState === 1) {
      ready = true;
      break;
    }
  } catch (_) {
    /* election in progress */
  }
  sleep(1000);
}
if (!ready) throw new Error('MongoDB did not elect a primary');
