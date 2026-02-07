"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { useState } from "react";

export default function AdminDashboard() {
  const [stats] = useState({
    totalArticles: 156,
    todaySummaries: 12,
    activeUsers: 48,
    emailsSent: 234,
  });

  const [recentArticles] = useState([
    {
      id: 1,
      title: "Breaking: Major Climate Agreement Reached",
      status: "published",
      date: "2024-02-07",
      views: 1523,
    },
    {
      id: 2,
      title: "Tech Innovation: New AI Assistant Unveiled",
      status: "published",
      date: "2024-02-07",
      views: 987,
    },
    {
      id: 3,
      title: "Local Community Saves Historic Theatre",
      status: "draft",
      date: "2024-02-06",
      views: 456,
    },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your Sky News Summariser content and settings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <CardBody className="p-6">
            <div className="flex flex-col">
              <span className="text-white/80 text-sm font-medium mb-1">
                Total Articles
              </span>
              <span className="text-white text-3xl font-bold">
                {stats.totalArticles}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <CardBody className="p-6">
            <div className="flex flex-col">
              <span className="text-white/80 text-sm font-medium mb-1">
                Today's Summaries
              </span>
              <span className="text-white text-3xl font-bold">
                {stats.todaySummaries}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600">
          <CardBody className="p-6">
            <div className="flex flex-col">
              <span className="text-white/80 text-sm font-medium mb-1">
                Active Users
              </span>
              <span className="text-white text-3xl font-bold">
                {stats.activeUsers}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <CardBody className="p-6">
            <div className="flex flex-col">
              <span className="text-white/80 text-sm font-medium mb-1">
                Emails Sent
              </span>
              <span className="text-white text-3xl font-bold">
                {stats.emailsSent}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader className="px-6 pt-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </CardHeader>
        <CardBody className="px-6 py-6">
          <div className="flex flex-wrap gap-4">
            <Button color="primary" size="lg">
              Fetch New Articles
            </Button>
            <Button color="secondary" size="lg" variant="flat">
              Generate Summaries
            </Button>
            <Button color="success" size="lg" variant="flat">
              Send Email Digest
            </Button>
            <Button color="default" size="lg" variant="flat">
              View Analytics
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Recent Articles */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent Articles
          </h2>
        </CardHeader>
        <CardBody className="px-6 py-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Views
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                      {article.title}
                    </td>
                    <td className="py-4 px-4">
                      <Chip
                        color={
                          article.status === "published" ? "success" : "warning"
                        }
                        size="sm"
                        variant="flat"
                      >
                        {article.status}
                      </Chip>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {article.date}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {article.views.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="flat" color="primary">
                          Edit
                        </Button>
                        <Button size="sm" variant="flat" color="danger">
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
