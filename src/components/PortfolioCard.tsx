"use client";

import React from "react";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PortfolioProject } from "@/config/portfolio";

interface PortfolioCardProps {
  project: PortfolioProject;
  className?: string;
}

/**
 * Карточка проекта портфолио
 */
export const PortfolioCard = React.memo(
  ({ project, className }: PortfolioCardProps) => {
    return (
      <Card
        className={cn("flex flex-col h-full transition-transform hover:scale-105", className)}
        hoverable>
        {/* Изображение проекта (заглушка) */}
        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 rounded-t-lg mb-4 flex items-center justify-center">
          {project.image ? (
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="text-white text-4xl font-bold opacity-50">
              {project.title.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-grow flex flex-col">
          {/* Категория */}
          <span className="text-sm text-blue-600 font-medium mb-2">
            {project.category}
          </span>

          {/* Заголовок */}
          <Heading level={3} className="mb-2">
            {project.title}
          </Heading>

          {/* Описание */}
          <Text className="text-gray-600 mb-4 flex-grow">
            {project.description}
          </Text>

          {/* Технологии */}
          <div className="flex flex-wrap gap-2 mb-4">
            {project.technologies.map((tech, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                {tech}
              </span>
            ))}
          </div>

          {/* Дата */}
          <Text size="sm" className="text-gray-500 mb-4">
            {new Date(project.date).toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {/* Ссылки */}
          <div className="flex gap-2 mt-auto">
            {project.url && (
              <Link href={project.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="primary" className="flex-1">
                  Посмотреть
                </Button>
              </Link>
            )}
            {project.repository && (
              <Link
                href={project.repository}
                target="_blank"
                rel="noopener noreferrer">
                <Button size="sm" variant="secondary" className="flex-1">
                  Код
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    );
  }
);

PortfolioCard.displayName = "PortfolioCard";

