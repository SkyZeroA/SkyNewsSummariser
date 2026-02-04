"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button, Card, CardBody } from "@heroui/react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <p>This is Content page</p>
      <Card>
        <CardBody>
          <Button color="primary">Click me</Button>
        </CardBody>
      </Card>
      <Footer />
    </div>
  );
}
