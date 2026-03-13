import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { setProjectProblems } from '../store/fileSlice';

// Global socket instance to be shared if needed, 
// though for project problems a single connection here is fine.
export const projectSocket = io('http://localhost:3001');

const ProjectService = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    projectSocket.on('connect', () => {
      console.log('Connected to IDE Project Service');
    });

    projectSocket.on('project-problems', (problems) => {
      console.log('Received project problems:', problems.length);
      dispatch(setProjectProblems(problems));
    });

    return () => {
      projectSocket.off('project-problems');
    };
  }, [dispatch]);

  return null; // Headless component
};

export default ProjectService;
