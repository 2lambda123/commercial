import { GetThirdPartyTag } from '../types';

export const permutive: GetThirdPartyTag = ({ featureSwitch }) => ({
	shouldRun: featureSwitch,
	url: '//cdn.permutive.com/d6691a17-6fdb-4d26-85d6-b3dd27f55f08-web.js',
	sourcepointId: '5eff0d77969bfa03746427eb',
});