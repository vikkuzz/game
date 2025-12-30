import React from "react";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import Link from "next/link";

export default function CardNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <Section padding="xl">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-6">
            <svg
              className="w-24 h-24 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <Heading level={1} className="mb-4">
            Визитка не найдена
          </Heading>
          <Text className="text-gray-600 mb-6">
            К сожалению, визитка с таким адресом не существует или еще не активирована.
          </Text>
          <Link href="/create-card">
            <Button variant="primary">Создать визитку</Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}





