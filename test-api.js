async function test() {
  const res = await fetch('http://localhost:3000/api/auth/local-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test2@example.com', password: 'password', name: 'Test User 2' })
  });
  const data = await res.json();
  const cookies = res.headers.getSetCookie();
  const cookieString = cookies.map(c => c.split(';')[0]).join('; ');
  console.log(data, cookieString);

  const res2 = await fetch('http://localhost:3000/api/pharmacy/dashboard-summary', {
    headers: { 'Cookie': cookieString }
  });
  console.log("Dashboard:", await res2.json());
  
  const res3 = await fetch('http://localhost:3000/api/orders', {
    headers: { 'Cookie': cookieString }
  });
  console.log("Orders:", await res3.json());
  
  const res4 = await fetch('http://localhost:3000/api/notifications', {
    headers: { 'Cookie': cookieString }
  });
  console.log("Notifications:", await res4.json());
}
test();
