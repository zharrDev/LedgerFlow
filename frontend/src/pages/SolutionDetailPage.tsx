// frontend/src/pages/SolutionDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../components/DetailPageTemplate";
import { solutionsContent } from "../data/solutionsContent";

export default function SolutionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? solutionsContent[slug] : undefined;

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
