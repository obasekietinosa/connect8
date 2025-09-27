# Deployment Notes

## Server deployment workflow
- GitHub Actions builds the Node.js server from the `server/` directory using `npm ci` and `npm run build`.
- The resulting bundle is uploaded with `SamKirkland/web-deploy@v1`, using `source-path: ./server/` and `destination-path: ./server/`.
- Because the action targets a dedicated `~/server` folder on the remote host, it keeps the application files in sync without touching unrelated directories such as `~/.ssh`.
- The action's default synchronization options are sufficient now that deployments stay within the isolated target directory.
