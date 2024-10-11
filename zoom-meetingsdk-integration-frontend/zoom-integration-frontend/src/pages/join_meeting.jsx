import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

function MeetingApp() {
  const client = ZoomMtgEmbedded.createClient();

  const authEndpoint = 'http://localhost:3000/sdk_auth'; // http://localhost:4000
  const sdkKey = import.meta.env.VITE_ZOOM_CLIENT_ID;
  const meetingNumber = '83712671760';
  const passWord = 'yxBL9h';
  const role = 0;
  const userName = 'React';
  const userEmail = 'ibrahim@gmail.com';
  const registrantToken = '';
  const zakToken = '';

  const getSignature = async () => {
    try {
      const req = await fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNumber: meetingNumber,
          role: role,
        }),
      });
      const res = await req.json();
      const signature = res.signature;
      startMeeting(signature);
    } catch (e) {
      console.log(e);
    }
  };

  async function startMeeting(signature) {
    const meetingSDKElement = document.getElementById('meetingSDKElement');
    try {
      await client.init({
        zoomAppRoot: meetingSDKElement,
        language: 'en-US',
        patchJsMedia: true,
        leaveOnPageUnload: true,
      });
      await client.join({
        signature: signature,
        sdkKey: sdkKey,
        meetingNumber: meetingNumber,
        password: passWord,
        userName: userName,
        userEmail: userEmail,
        tk: registrantToken,
        zak: zakToken,
      });
      console.log('joined successfully');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="App">
      <main>
        <h1>Zoom Meeting SDK Sample React</h1>
        {/* For Component View */}
        <div id="meetingSDKElement">{/* Zoom Meeting SDK Component View Rendered Here */}</div>
        <button onClick={getSignature}>Join Meeting</button>
      </main>
    </div>
  );
}

export default MeetingApp;
