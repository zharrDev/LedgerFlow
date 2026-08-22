// frontend/src/pages/ToolDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../components/DetailPageTemplate";
import { toolsContent } from "../data/toolsContent";

export default function ToolDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? toolsContent[slug] : undefined;

  if (!content) {
    return <Navigate to="/404" replace />;
  }

  return (
    <DetailPageTemplate
      content={content}
      backHref="/"
      backLabel="Back to Home"
    />
  );
}
