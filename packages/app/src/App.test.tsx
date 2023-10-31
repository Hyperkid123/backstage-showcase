import React from 'react';
import { renderWithEffects } from '@backstage/test-utils';
import { removeScalprum } from '@scalprum/core';
import { mockPluginData } from '@scalprum/react-test-utils';
import TestRoot from './utils/test/TestRoot';

const AppBase = React.lazy(() => import('./components/AppBase'));

describe('App', () => {
  beforeEach(() => {
    removeScalprum();
  });
  it('should render', async () => {
    const { TestScalprumProvider } = mockPluginData({}, {});
    process.env = {
      NODE_ENV: 'test',
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
            auth: { environment: 'development' },
          },
          context: 'test',
        },
      ] as any,
    };

    const rendered = await renderWithEffects(
      <TestScalprumProvider>
        <TestRoot>
          <React.Suspense fallback={null}>
            <AppBase />
          </React.Suspense>
        </TestRoot>
      </TestScalprumProvider>,
    );
    expect(rendered.baseElement).toBeInTheDocument();
  }, 20000);
});
