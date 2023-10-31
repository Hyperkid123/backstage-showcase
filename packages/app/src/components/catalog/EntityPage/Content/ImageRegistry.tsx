import { type Entity } from '@backstage/catalog-model';
import { EntitySwitch } from '@backstage/plugin-catalog';
import {
  JfrogArtifactoryPage,
  isJfrogArtifactoryAvailable,
} from '@janus-idp/backstage-plugin-jfrog-artifactory';
import {
  isNexusRepositoryManagerAvailable,
  NexusRepositoryManagerPage,
} from '@janus-idp/backstage-plugin-nexus-repository-manager';
import Grid from '@mui/material/Grid';
import React from 'react';
import getMountPointData from '../../../../utils/dynamicUI/getMountPointData';

const ifImageRegistries: ((e: Entity) => boolean)[] = [
  // TODO: Figure out how to detect if the plugin was configured
  e => !!e.metadata.annotations?.['quay.io/repository-slug'],
  isJfrogArtifactoryAvailable,
];

export const isImageRegistriesAvailable = (e: Entity) => {
  return ifImageRegistries.some(f => f(e));
};

export const imageRegistry = (
  <Grid container spacing={3}>
    {getMountPointData<React.ComponentType>('image-registry').map(
      (Component, index) => (
        <Grid item xs={12} key={index}>
          <Component />
        </Grid>
      ),
    )}
    <EntitySwitch>
      <EntitySwitch.Case if={isJfrogArtifactoryAvailable}>
        <Grid item xs={12}>
          <JfrogArtifactoryPage />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
    <EntitySwitch>
      <EntitySwitch.Case if={isNexusRepositoryManagerAvailable}>
        <Grid item xs={12}>
          <NexusRepositoryManagerPage />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </Grid>
);
