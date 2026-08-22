import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import * as api from '../api/integrations.api';
import type { IntegrationProvider, SelectedIntegrationResources } from '../types/integration.types';
export function useIntegrationConnections(){const{workspaceId=''}=useParams();return useQuery({queryKey:[workspaceId,'integration-connections'],queryFn:()=>api.listIntegrationConnections(workspaceId),enabled:Boolean(workspaceId),retry:false});}
export function useIntegrationActions(){
 const{workspaceId=''}=useParams();const client=useQueryClient(),invalidate=()=>client.invalidateQueries({queryKey:[workspaceId,'integration-connections']});
 return{
  create:useMutation({mutationFn:({provider,name}:{provider:IntegrationProvider;name:string})=>api.createIntegrationConnection(workspaceId,provider,name),onSuccess:invalidate}),
  beginOAuth:useMutation({mutationFn:({id,redirectUri}:{id:string;redirectUri:string})=>api.beginIntegrationOAuth(workspaceId,id,redirectUri)}),
  completeOAuth:useMutation({mutationFn:({state,code}:{state:string;code:string})=>api.completeIntegrationOAuth(state,code),onSuccess:invalidate}),
  resources:useMutation({mutationFn:(id:string)=>api.discoverIntegrationResources(workspaceId,id)}),
  select:useMutation({mutationFn:({id,selection}:{id:string;selection:SelectedIntegrationResources})=>api.selectIntegrationResources(workspaceId,id,selection),onSuccess:invalidate}),
  subscribe:useMutation({mutationFn:(id:string)=>api.subscribeIntegrationWebhooks(workspaceId,id),onSuccess:invalidate}),
  validate:useMutation({mutationFn:(id:string)=>api.validateIntegration(workspaceId,id),onSuccess:invalidate}),
  health:useMutation({mutationFn:(id:string)=>api.integrationHealth(workspaceId,id),onSuccess:invalidate}),
  refresh:useMutation({mutationFn:(id:string)=>api.refreshIntegration(workspaceId,id),onSuccess:invalidate}),
  disconnect:useMutation({mutationFn:(id:string)=>api.disconnectIntegration(workspaceId,id),onSuccess:invalidate}),
 };
}
