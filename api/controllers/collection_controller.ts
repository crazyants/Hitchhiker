import { CollectionService } from '../services/collection_service';
import { UserCollectionService } from '../services/user_collection_service';
import { GET, POST, PUT, BodyParam, PathParam, BaseController } from 'webapi-router';
import { ResObject } from "../common/res_object";
import * as Koa from 'koa';
import { DtoCollection, DtoCollectionWithRecord } from "../interfaces/dto_collection";
import { SessionService } from "../services/session_service";
import { MetadataService } from "../services/metadata_service";
import { Message } from "../common/message";
import { EnvironmentService } from "../services/environment_service";
import * as _ from 'lodash';
import { RecordService } from "../services/record_service";
import { DtoRecord } from "../interfaces/dto_record";

export default class CollectionController extends BaseController {

    @GET('/collections')
    async getCollections(ctx: Koa.Context): Promise<DtoCollectionWithRecord> {
        const userId = SessionService.getUserId(ctx);
        const { collections, recordsList } = await UserCollectionService.getUserCollections(userId);
        let records: _.Dictionary<_.Dictionary<DtoRecord>> = {};
        _.keys(recordsList).forEach(k => records[k] = _.chain(recordsList[k]).map(r => RecordService.toDto(r)).keyBy('id').value());
        return {
            collections: _.keyBy<DtoCollection>(collections.map(c => CollectionService.toDto(c)), 'id'),
            records
        };
    }

    @POST('/collection')
    async create(ctx: Koa.Context, @BodyParam collection: DtoCollection): Promise<ResObject> {
        const userId = SessionService.getUserId(ctx);
        return await CollectionService.create(collection.name, collection.description, userId);
    }

    @PUT('/collection')
    async update(ctx: Koa.Context, @BodyParam collection: DtoCollection): Promise<ResObject> {
        return await CollectionService.update(collection, SessionService.getUserId(ctx));
    }

    @GET('/collection/share/:collectionid/to/:teamid')
    async share(ctx: Koa.Context, @PathParam('collectionid') collectionId: string, @PathParam('teamid') teamId: string): Promise<ResObject> {
        return await CollectionService.shareCollection(collectionId, teamId);
    }

    @POST('/collection/import/postman/to/:teamid')
    async importFromPostman(ctx: Koa.Context, @PathParam('teamid') teamId: string, @BodyParam info: any): Promise<ResObject> {
        const user = SessionService.getUser(ctx);
        const collections = await MetadataService.convertPostmanCollection(user, teamId, info);
        const environments = await MetadataService.convertPostmanEnvV1(user, teamId, info);
        collections.forEach(c => CollectionService.save(c));
        environments.forEach(e => EnvironmentService.save(e));
        return { success: true, message: Message.importPostmanSuccess };
    }
}