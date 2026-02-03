# Sky News Summariser

A full-stack application that fetches and summarizes Sky News articles, with email notification capabilities.
This is hosted in AWS

## Table of Contents
- [Frontend Setup](#frontend-setup)
- [Running Tests](#running-tests)
- [Husky](#husky)

---

## Frontend Setup

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Getting Started

First, run the development server.
If in the root folder, run:

```bash
pnpm --dir frontend dev
```
If in the frontend folder, remove `--dir frontend`.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Running Tests

The test suites can be run using commands found in the `package.json` file.
They are as follows:

`pnpm run test` runs unit tests
`pnpm run coverage` runs these same unit tests and outputs the coverage

`pnpm run test-functional` runs functional tests - these will require you to be logged into the AWS account from your terminal

You can do that by doing the following:

```bash
aws --version
```
to check if you have AWS CLI installed.
if not run 
```bash
brew install awscli
```

Once it is installed, run `aws configure` to begin.
It will ask you for the following information:

`AWS ACCESS KEY ID` - found under Access Keys on the login page
`AWS ACCESS SECRET KEY` - found under Access Keys on the login page
`AWS SESSION TOKEN` - found under Access Keys on the login page
`Default region name` - `eu-west-1`
`Default output format` - `None` or press `Enter`

You will have to log in again if you close the terminal or any of the access keys or the session token expires

`pnpm run test-smoke` runs smoke tests - also requires login

---

## Husky

Husky runs commands at given points in the git cycle, like before each commit
The `pre-commit` file contains commands run before the commit, to ensure the code is formatted and tests pass
You might have to commit again if format changes your code so do not forget to