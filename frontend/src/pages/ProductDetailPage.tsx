// frontend/src/pages/ProductDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../components/DetailPageTemplate";
import { productContent } from "../data/productContent";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? productContent[slug] : undefined;

  if (!content) {
    return <Navigate to="/not-found" replace />;
  }

  return (
    <DetailPageTemplate
      content={content}
      backHref="/"
      backLabel="Back to Home"
    />
  );
}
