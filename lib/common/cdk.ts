export enum EnvironmentName {
	Main = 'main',
	Staging = 'staging',
}

export const isMain = (stage: string) => stage === (EnvironmentName.Main as string);
export const isStaging = (stage: string) => stage === (EnvironmentName.Staging as string);
export const isEphemeralEnv = (stage: string) => !([EnvironmentName.Staging, EnvironmentName.Main] as string[]).includes(stage);
