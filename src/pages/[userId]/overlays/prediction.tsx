import { useRouter } from "next/router";

export default function Page() {
  const router = useRouter();
  return <p>Prediction Overlay for user with id {router.query.userId}</p>;
}
