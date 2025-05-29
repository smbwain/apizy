import {arrayOf, boolean, extend, nullable, object, oneOf, optional, relation, string, uuid} from '../type-system';
import {createApi} from '../index';
import {sdkTsTemplate} from './sdk-ts-template';

describe('template', () => {
    describe('ts', () => {
        it('should build', () => {
            interface User {
                id: string;
                email: string;
                nick: string;
            }

            interface Project {
                id: string;
                name: string;
            }

            interface Member {
                id: string;
                name: string;
                email: string | null;
                projectId: string;
                userId: string | null;
                role: 'owner' | 'teacher';
            }

            const api = createApi();

            const $user = api.createEntity<User>('User');
            const $project = api.createEntity<Project>('Project');
            const $member = api.createEntity<Member>('Member');

            $user.addResolver({
                id: uuid(),
                email: string(),
                nick: string(),
            }, (data, ctx) => {
                return {
                    id: data.id,
                    email: data.email,
                    nick: data.nick,
                };
            });
            $project.addResolver({
                id: uuid(),
                name: string(),
            }, (data, ctx) => {
                return {
                    id: data.id,
                    name: data.name,
                };
            });
            $member.addResolver({
                id: uuid(),
                email: nullable(string()),
                name: string(),
                role: oneOf(['owner', 'teacher'] as const),
                project: relation($project, async () => null, {nullable: true}),
                user: relation($user, async () => null, {nullable: true}),
            }, (data) => {
                return {
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    email: data.email,
                    project: data.projectId,
                    user: data.userId,
                };
            });

            api.createMethod('users.getMe', null, nullable($user), async () => {
                return null;
            });
            api.createMethod('projects.get', uuid(), nullable($project), async () => {
                return null;
            });
            api.createMethod(
                'members.list',
                object({
                    projectId: optional(uuid()),
                    userId: optional(uuid()),
                    my: optional(boolean()),
                }),
                arrayOf($member),
                async () => {
                    return [];
                },
            );
            api.createMethod(
                'members.manage.add',
                object({
                    projectId: uuid(),
                    userId: uuid(),
                    name: string(),
                }),
                $member,
                async () => {
                    return null as any;
                },
            );
            api.createMethod(
                'members.manage.update',
                object({
                    id: uuid(),
                    name: optional(string()),
                }),
                $member,
                async () => {
                    return null as any;
                },
            );

            expect(sdkTsTemplate(api.apiDescription)).toMatchSnapshot();
        });
    });
});