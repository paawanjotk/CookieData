declare module './PrivateRoute' {
    import { FC, ReactNode } from 'react';
    interface PrivateRouteProps {
        children: ReactNode;
    }
    const PrivateRoute: FC<PrivateRouteProps>;
    export default PrivateRoute;
}

declare module './Layout' {
    import { FC } from 'react';
    const Layout: FC;
    export default Layout;
} 