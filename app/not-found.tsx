import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <span className="not-found-code">404</span>
      <h1>Page not found</h1>
      <p>That item isn’t in our collection. Let’s find you something else.</p>
      <Link className="button primary" href="/">
        Continue shopping
      </Link>
    </div>
  );
}
