import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import HomePage from './pages/HomePage';

const ProjectPage = lazy(() => import('./pages/ProjectPage'));

const Loading = () => <div className="flex h-full items-center justify-center text-gray-400">Loading map…</div>;

const router = createHashRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/project/:id',
    element: (
      <Suspense fallback={<Loading />}>
        <ProjectPage />
      </Suspense>
    ),
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
