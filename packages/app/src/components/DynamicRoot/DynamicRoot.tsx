/* eslint-disable @typescript-eslint/no-shadow */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { createApp } from '@backstage/app-defaults';
import { BackstageApp } from '@backstage/core-app-api';
import { AnyApiFactory } from '@backstage/core-plugin-api';

import { AppsConfig, getScalprum } from '@scalprum/core';
import { ScalprumProvider, useScalprum } from '@scalprum/react-core';

import DynamicRootContext, {
  DynamicRootContextValue,
  ScalprumMountPoint,
} from './DynamicRootContext';
import extractDynamicConfig from '../../utils/dynamicUI/extractDynamicConfig';
import initializeRemotePlugins from '../../utils/dynamicUI/initializeRemotePlugins';
import defaultThemes from './defaultThemes';
import defaultAppComponents from './defaultAppComponents';
import bindAppRoutes from '../../utils/dynamicUI/bindAppRoutes';

const DynamicRoot = ({
  afterInit,
  apis,
  scalprumConfig,
}: {
  // Static APIs
  apis: AnyApiFactory[];
  scalprumConfig: AppsConfig;
  afterInit: () => Promise<{ default: React.ComponentType }>;
}) => {
  const app = useRef<BackstageApp>();
  const [ChildComponent, setChildComponent] = useState<
    React.ComponentType | undefined
  >(undefined);
  // registry of remote components loaded at bootstrap
  const [components, setComponents] = useState<
    | {
        AppProvider: React.ComponentType;
        AppRouter: React.ComponentType;
        dynamicRoutes: DynamicRootContextValue[];
        mountPoints: { [mountPoint: string]: ScalprumMountPoint[] };
      }
    | undefined
  >();
  const { initialized, pluginStore } = useScalprum();

  // Fills registry of remote components
  const initializeRemoteModules = useCallback(async () => {
    const { dynamicRoutes, mountPoints, routeBindings } =
      extractDynamicConfig();

    const requiredModules = [
      ...mountPoints.map(({ module, scope }) => ({
        scope,
        module,
      })),
      ...dynamicRoutes.map(({ scope, module }) => ({
        scope,
        module,
      })),
    ];

    const remotePlugins = await initializeRemotePlugins(
      pluginStore,
      scalprumConfig,
      requiredModules,
    );

    if (!app.current) {
      app.current = createApp({
        apis,
        bindRoutes({ bind }) {
          bindAppRoutes(bind, remotePlugins, routeBindings);
        },
        themes: defaultThemes,
        components: defaultAppComponents,
      });
    }

    const providerMountPoints = mountPoints.map(
      ({ module, importName, mountPoint, scope }) => ({
        mountPoint,
        Component: remotePlugins[scope][module][importName],
      }),
    );

    const mountPointComponents = providerMountPoints.reduce<{
      [mountPoint: string]: ScalprumMountPoint[];
    }>((acc, entry) => {
      if (!acc[entry.mountPoint]) {
        acc[entry.mountPoint] = [];
      }
      acc[entry.mountPoint].push(entry.Component);
      return acc;
    }, {});
    getScalprum().api.mountPoints = mountPointComponents;
    const dynamicRoutesComponents = dynamicRoutes.map(route => ({
      ...route,
      Component: remotePlugins[route.scope][route.module][route.importName],
    }));
    setComponents({
      AppProvider: app.current.getProvider(),
      AppRouter: app.current.getRouter(),
      dynamicRoutes: dynamicRoutesComponents,
      mountPoints: mountPointComponents,
    });
    afterInit().then(({ default: Component }) => {
      setChildComponent(() => Component);
    });
  }, [pluginStore, scalprumConfig, apis, afterInit]);

  useEffect(() => {
    if (initialized && !components) {
      initializeRemoteModules();
    }
  }, [initialized, components, initializeRemoteModules]);

  if (!initialized || !components) {
    return null;
  }

  return (
    <DynamicRootContext.Provider value={components}>
      {ChildComponent ? <ChildComponent /> : <div>Loading</div>}
    </DynamicRootContext.Provider>
  );
};

const ScalprumRoot = ({
  apis,
  afterInit,
}: {
  // Static APIs
  apis: AnyApiFactory[];
  afterInit: () => Promise<{ default: React.ComponentType }>;
}) => {
  const [scalprumConfig, setScalprumConfig] = useState<AppsConfig | undefined>(
    undefined,
  );
  const loadScalprumConfig = async () => {
    const scalprumConfig: AppsConfig = await fetch(
      'http://localhost:7007/api/scalprum/plugins',
    ).then(r => r.json());
    setScalprumConfig(scalprumConfig);
  };

  useEffect(() => {
    loadScalprumConfig();
  }, []);

  if (!scalprumConfig) {
    return null;
  }
  return (
    <ScalprumProvider
      config={scalprumConfig}
      pluginSDKOptions={{
        pluginLoaderOptions: {
          postProcessManifest: manifest => {
            return {
              ...manifest,
              loadScripts: manifest.loadScripts.map(
                script =>
                  `http://localhost:7007/api/scalprum/${manifest.name}/${script}`,
              ),
            };
          },
        },
      }}
    >
      <DynamicRoot
        afterInit={afterInit}
        scalprumConfig={scalprumConfig}
        apis={apis}
      />
    </ScalprumProvider>
  );
};

export default ScalprumRoot;
