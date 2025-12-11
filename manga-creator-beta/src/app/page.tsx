import dynamic from "next/dynamic";

const ClientPage = dynamic(() => import("./client-page"), { ssr: false });

export default function Page() {
  return <ClientPage />;
}
