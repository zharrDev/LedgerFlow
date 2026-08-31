// frontend/src/pages/CompanyDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import DetailPageTemplate from "../components/DetailPageTemplate";
import { companyContent } from "../data/companyContent";

export default function CompanyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? companyContent[slug] : undefined;

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
