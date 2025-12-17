# Publishing exchange-graphbase

## Steps to Publish

### 1. Create a GitHub Fork (if you haven't already)

```bash
# Go to https://github.com/urql-graphql/urql and click "Fork"
# Or use GitHub CLI:
gh repo fork urql-graphql/urql --clone=false
```

### 2. Push your branch to your fork

```bash
# Add your fork as a remote (if not already added)
git remote add myfork https://github.com/royalcala/urql.git

# Push your graphbase branch
git push myfork graphbase
```

### 3. Log in to npm

```bash
npm login
# Enter your npm credentials
```

### 4. Publish the package

```bash
cd /home/rao/github/urql/exchanges/graphbase

# Do a dry run first to check everything
npm publish --dry-run

# If everything looks good, publish for real
npm publish
```

## Package Details

- **Name**: `exchange-graphbase`
- **Version**: `9.0.0`
- **Repository**: https://github.com/royalcala/urql
- **Author**: alcala.rao@gmail.com (Roy Alcala)

## What's Included

- TinyBase integration for GraphQL entity management
- All original graphcache functionality
- 43 passing tests (33 unit + 10 integration)
- TypeScript definitions
- ESM and CommonJS builds
- Minified versions

## After Publishing

Users can install it with:

```bash
npm install exchange-graphbase
# or
pnpm add exchange-graphbase
# or
yarn add exchange-graphbase
```

## Version Management

To publish a new version:

1. Update the version in `package.json`:

   ```bash
   npm version patch  # 9.0.0 -> 9.0.1
   npm version minor  # 9.0.0 -> 9.1.0
   npm version major  # 9.0.0 -> 10.0.0
   ```

2. Build and publish:
   ```bash
   pnpm run prepublishOnly
   npm publish
   ```

## Troubleshooting

### "You do not have permission to publish"

- Make sure you're logged in: `npm whoami`
- Check if the package name is already taken: `npm info exchange-graphbase`
- If taken, choose a different name like `@royalcala/exchange-graphbase`

### "Package not found on GitHub"

- Make sure you've pushed your branch: `git push myfork graphbase`
- Verify the repository URL in package.json is correct

### Build errors

- Run `pnpm run clean` then `pnpm run build`
- Check for TypeScript errors: `pnpm run check`
