
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('spawn-terminal', { terminalId: 'debug-term', cwd: 'D:\\ThugilCreationCourseAdminServer' });
});

socket.on('terminal-output-debug-term', (data) => {
  console.log('PTY Output:', data);
});

socket.on('terminal-exit-debug-term', (data) => {
  console.log('PTY Exited:', data);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});

setTimeout(() => {
  console.log('Timeout - no exit event received');
  process.exit(1);
}, 5000);
