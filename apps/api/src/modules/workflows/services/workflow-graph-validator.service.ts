import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TRIGGER_NODE_TYPES, type WorkflowGraph, type WorkflowNode } from '../types/workflow.types.js';
export interface GraphIssue { code:string; nodeId?:string; message:string }
@Injectable()
export class WorkflowGraphValidator {
 constructor(private readonly config:ConfigService){}
 validate(graph:WorkflowGraph):void{const issues=this.inspect(graph);if(issues.length)throw new BadRequestException({code:'INVALID_WORKFLOW_GRAPH',issues})}
 inspect(graph:WorkflowGraph):GraphIssue[]{const issues:GraphIssue[]=[];const nodes=new Map(graph.nodes.map(n=>[n.id,n]));if(!graph.nodes.some(n=>(TRIGGER_NODE_TYPES as readonly string[]).includes(n.type)))issues.push({code:'MISSING_TRIGGER',message:'At least one trigger is required'});
  if(nodes.size!==graph.nodes.length)issues.push({code:'DUPLICATE_NODE_ID',message:'Node IDs must be unique'});
  const connected=new Set<string>();for(const edge of graph.edges){connected.add(edge.source);connected.add(edge.target);if(!nodes.has(edge.source)||!nodes.has(edge.target))issues.push({code:'INVALID_REFERENCE',message:`Invalid edge ${edge.source} -> ${edge.target}`})}
  for(const node of graph.nodes){if(graph.nodes.length>1&&!connected.has(node.id))issues.push({code:'DISCONNECTED_NODE',nodeId:node.id,message:'Node is disconnected'});this.validateConfig(node,graph,issues)}
  this.findCycles(graph,nodes,issues);return issues}
 private validateConfig(node:WorkflowNode,graph:WorkflowGraph,issues:GraphIssue[]){const required:Partial<Record<WorkflowNode['type'],string[]>>={'send.email':['to','subject'],'send.sms':['to'],'send.whatsapp':['to'],'webhook.call':['url'],'delay':['durationMs'],'wait.until':['timestamp'],'condition':['expression'],'branch':['expression'],'loop':['maxIterations'],'task.create':['title'],'contact.update':['contactId']};for(const key of required[node.type]??[])if(node.config[key]===undefined)issues.push({code:'MISSING_CONFIGURATION',nodeId:node.id,message:`${key} is required`});
  if(node.type==='branch'){const targets=graph.edges.filter(e=>e.source===node.id);if(targets.length<2||targets.some(e=>!e.branch))issues.push({code:'INVALID_BRANCH_TARGET',nodeId:node.id,message:'Branch nodes require two or more named targets'})}
  if(node.type==='loop'){const limit=Number(node.config.maxIterations);if(!Number.isInteger(limit)||limit<1||limit>100)issues.push({code:'UNSAFE_LOOP_LIMIT',nodeId:node.id,message:'Loop maxIterations must be 1..100'})}
  if(node.type.startsWith('ai.')&&this.config.get<string>('ai.provider','disabled')==='disabled')issues.push({code:'INVALID_AI_CONFIGURATION',nodeId:node.id,message:'AI provider is unavailable'});
  if((node.type==='send.email'||node.type==='send.sms'||node.type==='send.whatsapp')&&node.config.integrationId===undefined)issues.push({code:'UNAVAILABLE_INTEGRATION',nodeId:node.id,message:'integrationId is required'})}
 private findCycles(graph:WorkflowGraph,nodes:Map<string,WorkflowNode>,issues:GraphIssue[]){const visiting=new Set<string>(),visited=new Set<string>();const walk=(id:string)=>{if(visiting.has(id)){if(nodes.get(id)?.type!=='loop')issues.push({code:'UNSUPPORTED_CYCLE',nodeId:id,message:'Cycles must be controlled by a loop node'});return}if(visited.has(id))return;visiting.add(id);for(const edge of graph.edges.filter(e=>e.source===id))walk(edge.target);visiting.delete(id);visited.add(id)};for(const id of nodes.keys())walk(id)}
}
