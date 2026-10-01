import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center" role="main" aria-label="Page not found">
      <p className="text-sm font-semibold text-green-700" aria-hidden="true">404</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you are looking for does not exist or was moved.</p>
      <Link to="/" className="mt-6 rounded-lg bg-green-700 px-5 py-2.5 text-white font-semibold hover:bg-green-800" aria-label="Go back home">
        Go back home
      </Link>
    </main>
  );
}
