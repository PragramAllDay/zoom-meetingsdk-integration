import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [meetingDetails, setMeetingDetails] = useState(null);

  const topic = 'My Zoom Meeting';
  const type = 2; // 1 for Instant, 2 for Scheduled
  const start_time = '2024-09-04T12:02:00Z';
  const duration = 30;
  const agenda = 'Discussion Agenda';

  // Function to create meeting
  async function createMeeting(accessToken) {
    try {
      const res = await axios.post('http://localhost:3000/api/create-meeting', {
        topic,
        type,
        start_time,
        duration,
        agenda,
        accessTokens: accessToken,
      });
      setMeetingDetails(res.data);
    } catch (err) {
      console.error('Error creating meeting:', err.message);
    }
  }

  // OAuth and meeting creation flow
  function handleZoomOAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      axios
        .post('http://localhost:3000/api/get-zoom-token', { code })
        .then((response) => createMeeting(response.data.access_token))
        .catch((error) => console.error('Error fetching token:', error.message));
    } else {
      const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=YOUR_ZOOM_CLIENT_ID&redirect_uri=http://localhost:3000`;
      window.location.href = zoomAuthUrl; // Redirect to Zoom OAuth page
    }
  }

  useEffect(() => {
    handleZoomOAuth();
  }, []);

  return (
    <div>
      {meetingDetails ? (
        <div>
          <p>Meeting Created: {meetingDetails.topic}</p>
          <p>Join URL: {meetingDetails.join_url}</p>
          <p>Password: {meetingDetails.password}</p>
        </div>
      ) : (
        <p>Creating Zoom Meeting...</p>
      )}
    </div>
  );
}

export default App;
