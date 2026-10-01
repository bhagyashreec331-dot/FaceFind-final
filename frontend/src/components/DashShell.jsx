import Layout from './Layout';

export default function DashShell({ children }) {
  return (
    <Layout>
      <div className="dash">
        <div className="dash-main">
          {children}
        </div>
      </div>
    </Layout>
  );
}