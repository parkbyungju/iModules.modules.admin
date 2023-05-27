/**
 * 이 파일은 아이모듈 관리자모듈의 일부입니다. (https://www.imodules.io)
 *
 * 데이터스토어 클래스를 정의한다.
 *
 * @file /modules/admin/scripts/Admin.Store.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2023. 5. 27.
 */
namespace Admin {
    export namespace Store {
        export interface Properties extends Admin.Base.Properties {
            /**
             * @type {string[]} - 레코드 고유값
             */
            primaryKeys?: string[];

            /**
             * @type {Object} fieldTypes - 필드값의 타입을 정의한다.
             */
            fieldTypes?: { [field: string]: 'int' | 'float' | 'string' | 'boolean' | 'object' };

            /**
             * @type {Object} sorters - 데이터 정렬방식
             */
            sorters?: { field: string; direction: string }[];

            /**
             * @type {boolean} remoteSort - store 외부에서 데이터를 정렬할지 여부
             */
            remoteSort?: boolean;

            /**
             * @type {Object} filters - 데이터 필터
             */
            filters?: { [field: string]: { value: any; operator: string } };

            /**
             * @type {boolean} remoteFilter - store 외부에서 데이터를 필터링할지 여부
             */
            remoteFilter?: boolean;
        }
    }

    export class Store extends Admin.Base {
        primaryKeys: string[];
        fieldTypes: { [field: string]: 'int' | 'float' | 'string' | 'boolean' | 'object' };
        sorters: { field: string; direction: string }[];
        remoteSort: boolean = false;
        filters: { [field: string]: { value: any; operator: string } };
        remoteFilter: boolean = false;
        loading: boolean = false;
        loaded: boolean = false;
        data: Admin.Data;
        count: number = 0;
        total: number = 0;

        /**
         * 데이터스토어를 생성한다.
         *
         * @param {Admin.Store.Properties} properties - 객체설정
         */
        constructor(properties: Admin.Store.Properties = null) {
            super(properties);

            this.primaryKeys = this.properties.primaryKeys ?? [];
            this.fieldTypes = this.properties.fieldTypes ?? {};
            this.sorters = this.properties.sorters ?? [];
            this.remoteSort = this.properties.remoteSort === true;
            this.filters = this.properties.filters ?? {};
            this.remoteFilter = this.properties.remoteFilter === true;

            if (this.properties.sorter) {
                this.sorters.push({ field: this.properties.sorter[0], direction: this.properties.sorter[1] });
            }
        }

        /**
         * 데이터가 로딩되었는지 확인한다.
         *
         * @return {boolean} is_loaded
         */
        isLoaded(): boolean {
            return this.loaded;
        }

        /**
         * 데이터셋을 가져온다.
         *
         * @return {Admin.Data} data
         */
        getData(): Admin.Data {
            return this.data;
        }

        /**
         * 데이터 갯수를 가져온다.
         *
         * @return {number} count
         */
        getCount(): number {
            return this.count ?? 0;
        }

        /**
         * 데이터를 가져온다.
         *
         * @return {Admin.Data.Record[]} records
         */
        getRecords(): Admin.Data.Record[] {
            return this.data?.getRecords() ?? [];
        }

        /**
         * 고유키값을 가져온다.
         *
         * @return {string[]} primary_keys
         */
        getPrimaryKeys(): string[] {
            return this.primaryKeys;
        }

        /**
         * 데이터를 추가한다.
         *
         * @param {Object|Object[]} record
         */
        add(record: { [key: string]: any } | { [key: string]: any }[]): void {
            let records = [];
            if (Array.isArray(record) == true) {
                records = record as { [key: string]: any }[];
            } else {
                records.push(record);
            }
            this.data?.add(records);
            this.onUpdate();
        }

        /**
         * 데이터를 가져온다.
         */
        load(): void {}

        /**
         * 현재 데이터를 새로고침한다.
         */
        reload(): void {}

        /**
         * 특정 필드의 특정값을 가진 레코드를 찾는다.
         *
         * @param {string} field - 검색필드
         * @param {any} value - 검색값
         * @return {Admin.Data.Record} record - 검색된 레코드
         */
        find(field: string, value: any): Admin.Data.Record {
            for (const record of this.getRecords()) {
                if (record.get(field) == value) {
                    return record;
                }
            }

            return null;
        }

        /**
         * 특정 필드의 특정값을 가진 레코드 인덱스를 찾는다.
         *
         * @param {string} field - 검색필드
         * @param {any} value - 검색값
         * @return {number} index - 검색된 레코드의 인덱스
         */
        findIndex(field: string, value: any): number {
            for (const key in this.getRecords()) {
                const index = parseInt(key, 10);
                const record = this.getRecords().at(index);
                if (record.get(field) == value) {
                    return index;
                }
            }

            return null;
        }

        /**
         * 데이터와 일치하는 레코드의 인덱스를 찾는다.
         *
         * @param {Admin.Data.Record} matcher - 찾을 레코드
         * @param {string[]} fields - PRIMARY 필드 (NULL 인 경우 matcher 의 전체 필드가 일치하는 레코드를, 설정된 경우 해당 필드만 검색한다.)
         * @return {number} index - 검색된 데이터의 인덱스
         */
        matchIndex(matcher: Admin.Data.Record, fields: string[] = null): number {
            if (fields === null || fields.length == 0) {
                fields = matcher.getKeys();
            }

            for (const key in this.getRecords()) {
                const index = parseInt(key, 10);
                const record = this.getRecords().at(index);

                let isMatched = true;
                for (const field of fields) {
                    if (matcher.get(field) !== record.get(field)) {
                        isMatched = false;
                        continue;
                    }
                }

                if (isMatched === true) {
                    return index;
                }
            }

            return null;
        }

        /**
         * 데이터를 정렬한다.
         *
         * @param {string} field - 정렬할 필드명
         * @param {string} direction - 정렬방향 (asc, desc)
         */
        sort(field: string, direction: string): void {
            this.multiSort([{ field: field, direction: direction }]);
        }

        /**
         * 데이터를 다중 정렬기준에 따라 정렬한다.
         *
         * @param {Object} sorters - 정렬기준 [{field:string, direction:(ASC|DESC)}, ...]
         */
        async multiSort(sorters: { field: string; direction: string }[]): Promise<void> {
            this.sorters = sorters;
            if (this.remoteSort == true) {
                this.reload();
            } else {
                this.data?.sort(this.sorters).then(() => {
                    this.onUpdate();
                });
            }
        }

        /**
         * 필터를 설정한다.
         *
         * @param {string} field - 필터링할 필드명
         * @param {any} value - 필터링에 사용할 기준값
         * @param {string} operator - 필터 명령어 (=, !=, >=, <= 또는 remoteFilter 가 true 인 경우 사용자 정의 명령어)
         */
        setFilter(field: string, value: any, operator: string = '='): void {
            this.filters[field] = { value: value, operator: operator };
            this.filter();
        }

        /**
         * 특정 필드의 필터를 제거한다.
         *
         * @param {string} field
         */
        removeFilter(field: string): void {
            delete this.filters[field];
            this.filter();
        }

        /**
         * 모든 필터를 초기화한다.
         */
        resetFilter(): void {
            this.filters = {};
            this.filter();
        }

        /**
         * 정의된 필터링 규칙에 따라 필터링한다.
         */
        async filter(): Promise<void> {
            if (this.remoteFilter === true) {
                this.reload();
            } else {
                this.data?.filter(this.filters).then(() => {
                    this.onUpdate();
                });
            }
        }

        /**
         * 데이터가 로딩되기 전 이벤트를 처리한다.
         */
        onBeforeLoad(): void {
            this.fireEvent('beforeLoad', [this]);
        }

        /**
         * 데이터가 로딩되었을 때 이벤트를 처리한다.
         */
        onLoad(): void {
            this.fireEvent('load', [this, this.data]);
            this.onUpdate();
        }

        /**
         * 데이터가 변경되었을 때 이벤트를 처리한다.
         */
        onUpdate(): void {
            if (Format.isEqual(this.data?.sorters, this.sorters) == false) {
                if (this.remoteSort == true) {
                    this.reload();
                } else {
                    this.data?.sort(this.sorters).then(() => {
                        this.onUpdate();
                    });
                }
            } else if (Format.isEqual(this.data?.filters, this.filters) == false) {
                if (this.remoteSort == true) {
                    this.reload();
                } else {
                    this.data?.filter(this.filters).then(() => {
                        this.onUpdate();
                    });
                }
            } else {
                this.fireEvent('update', [this, this.data]);
            }
        }
    }

    export namespace Store {
        export namespace Array {
            export interface Properties extends Admin.Store.Properties {
                /**
                 * @type {string[]} fields - 데이터 필드
                 */
                fields: string[];

                /**
                 * @type {string[][]} records - 데이터
                 */
                records?: any[][];
            }
        }

        export class Array extends Admin.Store {
            fields: string[];
            records: any[][];

            /**
             * Array 스토어를 생성한다.
             *
             * @param {Admin.Store.Array.Properties} properties - 객체설정
             */
            constructor(properties: Admin.Store.Array.Properties = null) {
                super(properties);

                this.fields = this.properties.fields ?? [];
                this.records = this.properties.records ?? [];
                this.remoteSort = false;
                this.load();
            }

            /**
             * 데이터를 가져온다.
             */
            load(): void {
                this.onBeforeLoad();

                if (this.loaded == true) {
                    this.onLoad();
                    return;
                }

                const records = [];
                this.records.forEach((item) => {
                    const record: { [key: string]: any } = {};
                    this.fields.forEach((name, index) => {
                        record[name] = item[index];
                    });
                    records.push(record);
                });
                this.loaded = true;
                this.data = new Admin.Data(records, this.fieldTypes);
                this.count = records.length;
                this.total = this.count;

                this.onLoad();
            }

            /**
             * 현재 데이터를 새로고침한다.
             */
            reload(): void {
                this.loaded = false;
                this.load();
            }
        }

        export namespace Ajax {
            export interface Properties extends Admin.Store.Properties {
                /**
                 * @type {'get'|'post'} method - 데이터를 가져올 방식
                 */
                method?: 'get' | 'post';

                /**
                 * @type {string} url - 데이터를 가져올 URL
                 */
                url: string;

                /**
                 * @type {Object} params - 데이터를 가져올때 사용할 매개변수
                 */
                params?: { [key: string]: any };

                /**
                 * @type {number} limit - 페이지당 가져올 갯수
                 */
                limit?: number;

                /**
                 * @type {number} page - 가져올 페이지 번호
                 */
                page?: number;

                /**
                 * @type {string} recordsField - 데이터가 있는 필드명
                 */
                recordsField?: string;

                /**
                 * @type {string} totalField - 데이터 총 갯수가 있는 필드명
                 */
                totalField?: string;
            }
        }

        export class Ajax extends Admin.Store {
            method: string;
            url: string;
            params: { [key: string]: any };
            limit: number;
            page: number;
            recordsField: string;
            totalField: string;

            /**
             * Ajax 스토어를 생성한다.
             *
             * @param {Object} properties - 객체설정
             */
            constructor(properties: Admin.Store.Ajax.Properties = null) {
                super(properties);

                this.url = this.properties?.url ?? null;
                this.params = this.properties.params ?? null;
                this.method = this.properties?.method?.toUpperCase() == 'POST' ? 'POST' : 'GET';
                this.limit = typeof this.properties?.limit == 'number' ? this.properties?.limit : 50;
                this.page = typeof this.properties?.page == 'number' ? this.properties?.page : 50;
                this.recordsField = this.properties.recordsField ?? 'records';
                this.totalField = this.properties.totalField ?? 'total';
            }

            /**
             * 데이터를 불러오기 위한 매개변수를 설정한다.
             *
             * @param {Object} params - 매개변수
             */
            setParams(params: { [key: string]: any }): void {
                for (const key in params) {
                    this.setParam(key, params[key]);
                }
            }

            /**
             * 데이터를 불러오기 위한 매개변수를 설정한다.
             *
             * @param {string} key - 매개변수명
             * @param {any} value - 매개변수값
             */
            setParam(key: string, value: any) {
                this.params ??= {};
                this.params[key] = value;
            }

            /**
             * 데이터를 불러오기 위한 매개변수를 가져온다.
             *
             * @return {Object} params - 매개변수
             */
            getParams(): { [key: string]: any } {
                return this.params ?? {};
            }

            /**
             * 데이터를 불러오기 위한 매개변수를 가져온다.
             *
             * @param {string} key - 매개변수명
             * @return {any} value - 매개변수값
             */
            getParam(key: string): any {
                return this.getParams()[key] ?? null;
            }

            /**
             * 데이터를 가져온다.
             */
            load(): void {
                this.onBeforeLoad();

                if (this.loaded == true) {
                    this.onLoad();
                    return;
                }

                if (this.loading == true) {
                    return;
                }

                this.loading = true;

                Admin.Ajax.get(this.url, this.params)
                    .then((results: Admin.Ajax.Results) => {
                        if (results.success == true) {
                            this.loaded = true;
                            this.data = new Admin.Data(results[this.recordsField] ?? [], this.fieldTypes);
                            this.count = results.records.length;
                            this.total = results[this.totalField] ?? 0;

                            this.onLoad();
                        }

                        this.loading = false;
                    })
                    .catch((e) => {
                        console.error(e);
                        this.loading = false;
                        this.loaded = false;
                    });
            }

            /**
             * 현재 데이터를 새로고침한다.
             */
            reload(): void {
                this.loaded = false;
                this.load();
            }
        }
    }
}
