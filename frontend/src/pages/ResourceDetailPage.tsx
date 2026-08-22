// frontend/src/pages/ResourceDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../components/DetailPageTemplate";
import { resourcesContent } from "../data/resourcesContent";

export default function ResourceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? resourcesContent[slug] : undefined;

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
