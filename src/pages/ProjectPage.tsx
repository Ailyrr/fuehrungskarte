import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import MapView from '../components/MapView';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const load = useProjectStore((s) => s.load);
  const close = useProjectStore((s) => s.close);
  const project = useProjectStore((s) => s.project);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const ok = load(id);
    if (!ok) setNotFound(true);
    return () => close();
  }, [id, load, close]);

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-gray-300">This project could not be found.</p>
        <button onClick={() => navigate('/')} className="rounded-lg bg-sky-600 px-5 py-2 font-semibold text-white">
          Back to projects
        </button>
      </div>
    );
  }

  if (!project) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading map…</div>;
  }

  return <MapView />;
}
