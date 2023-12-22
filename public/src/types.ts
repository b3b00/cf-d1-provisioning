// Generated by https://quicktype.io
//
// To change quicktype's target language, run command:
//
//   "Set quicktype target language"

import { Guid } from "guid-typescript";

export interface D1Result<T> {
    ok:     boolean;
    errors: string[];
    result: T;
}

export interface CFResult<T> {
    result:   T;
    success:  boolean;
    errors:   any[];
    messages: any[];
}

export interface ProjectInfo {
    id:                     string;
    name:                   string;
    subdomain:              string;
    domains:                string[];
    source:                 ResultSource;
    build_config:           BuildConfig;
    deployment_configs:     DeploymentConfigs;
    latest_deployment:      LatestDeployment;
    canonical_deployment:   CanonicalDeployment;
    created_on:             string;
    production_branch:      string;
    production_script_name: string;
    preview_script_name:    string;
}

export interface BuildConfig {
    build_command:       string;
    destination_dir:     string;
    build_caching:       boolean;
    root_dir:            string;
    web_analytics_tag:   null | string;
    web_analytics_token: null | string;
}

export interface CanonicalDeployment {
    id:                        string;
    short_id:                  string;
    project_id:                string;
    project_name:              string;
    environment:               string;
    url:                       string;
    created_on:                string;
    modified_on:               string;
    latest_stage:              Stage;
    deployment_trigger:        DeploymentTrigger;
    stages:                    Stage[];
    build_config:              BuildConfig;
    source:                    CanonicalDeploymentSource;
    env_vars:                  CanonicalDeploymentEnvVars;
    kv_namespaces:             Map<string,KVNamespace>;
    d1_databases:              Map<string,D1>;
    compatibility_date:        string;
    compatibility_flags:       any[];
    build_image_major_version: number;
    usage_model:               string;
    aliases:                   null;
    is_skipped:                boolean;
    production_branch:         string;
}



export interface D1 {
    //id: Guid;
    uuid:Guid;
    name: string;
}

export interface DeploymentTrigger {
    type:     string;
    metadata: Metadata;
}

export interface Metadata {
    branch:         string;
    commit_hash:    string;
    commit_message: string;
    commit_dirty:   boolean;
}

export interface CanonicalDeploymentEnvVars {

}

export interface AccountID {
    type:  string;
    value: string;
}

export interface KVNamespace {
    namespace_id: string;
}



export interface Stage {
    name:       string;
    started_on: null | string;
    ended_on:   null | string;
    status:     Status;
}

export enum Status {
    Active = "active",
    Idle = "idle",
    Success = "success",
}

export interface CanonicalDeploymentSource {
    type:   string;
    config: PurpleConfig;
}

export interface PurpleConfig {
    owner:               string;
    repo_name:           string;
    production_branch:   string;
    pr_comments_enabled: boolean;
}

export interface DeploymentConfigs {
    preview:    DeploymentConfig;
    production: DeploymentConfig;
}

export interface DeploymentConfig {
    env_vars:                             CanonicalDeploymentEnvVars | null;
    fail_open:                            boolean;
    always_use_latest_compatibility_date: boolean;
    compatibility_date:                   string;
    compatibility_flags:                  any[];
    build_image_major_version:            number;
    usage_model:                          string;
    kv_namespaces?:                       Map<string,KVNamespace>;
    d1_databases?:                        Map<string,D1>;
}

export interface LatestDeployment {
    id:                        string;
    short_id:                  string;
    project_id:                string;
    project_name:              string;
    environment:               string;
    url:                       string;
    created_on:                string;
    modified_on:               string;
    latest_stage:              Stage;
    deployment_trigger:        DeploymentTrigger;
    stages:                    Stage[];
    build_config:              BuildConfig;
    source:                    CanonicalDeploymentSource;
    env_vars:                  LatestDeploymentEnvVars;
    compatibility_date:        string;
    compatibility_flags:       any[];
    build_image_major_version: number;
    usage_model:               null;
    aliases:                   string[];
    is_skipped:                boolean;
    production_branch:         string;
}

export interface LatestDeploymentEnvVars {
}

export interface ResultSource {
    type:   string;
    config: SourceConfig;
}

export interface SourceConfig {
    owner:                          string;
    repo_name:                      string;
    production_branch:              string;
    pr_comments_enabled:            boolean;
    deployments_enabled:            boolean;
    production_deployments_enabled: boolean;
    preview_deployment_setting:     string;
    preview_branch_includes:        string[];
    preview_branch_excludes:        any[];
}

export interface Deployment {
    id: Guid;
    project_id: Guid;
    environment: string;
    created_on: Date;
}
