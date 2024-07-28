const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body').default;
const serve = require('koa-static');
const path = require('path');
const routes = require('./routes');

const app = new Koa();
const router = new Router();

app.use(serve(path.join(__dirname, 'public')));
app.use(koaBody({
    multipart: true,
    formidable: {
        uploadDir: null,
        keepExtensions: false,
        maxFileSize: 5 * 1024 * 1024,
    },
}));

routes(router);

const PORT = 3000;
app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
