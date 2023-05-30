/**
 * 이 파일은 아이모듈 관리자모듈의 일부입니다. (https://www.imodules.io)
 *
 * 관리자모듈에서 사용되는 컴포넌트의 공통 클래스를 정의한다.
 *
 * @file /modules/admin/scripts/Admin.Component.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2023. 5. 30.
 */
namespace Admin {
    export namespace Component {
        export interface Listeners extends Admin.Base.Listeners {
            /**
             * @var {Function} render - 컴포넌트가 랜더링 되었을 때
             */
            render?: (component: Admin.Component) => void;

            /**
             * @var {Function} show - 컴포넌트가 보여질 떄
             */
            show?: (component: Admin.Component) => void;

            /**
             * @var {Function} hide - 컴포넌트가 숨겨질 떄
             */
            hide?: (component: Admin.Component) => void;
        }

        export interface Properties extends Admin.Base.Properties {
            /**
             * @type {(Admin.Component|any)[]} items - 컴포넌트의 하위 컴포넌트
             */
            items?: (Admin.Component | any)[];

            /**
             * @type {'auto'|'fit'|'column'|'column-item'} layout - 컴포넌트 레이아웃
             */
            layout?: 'auto' | 'fit' | 'column' | 'column-item';

            /**
             * @type {number} height - 컴포넌트너비
             */
            width?: string | number;

            /**
             * @type {number} height - 컴포넌트높이
             */
            height?: string | number;

            /**
             * @type {string|number} padding - 컴포넌트 내부 여백
             */
            padding?: string | number;

            /**
             * @type {string|number} margin - 컴포넌트 외부 여백
             */
            margin?: string | number;

            /**
             * @type {string|number} style - 컴포넌트 스타일정의
             */
            style?: string;

            /**
             * @type {string} class - 컴포넌트 스타일클래스
             */
            class?: string;

            /**
             * @type {boolean} hidden - 컴포넌트 숨김여부
             */
            hidden?: boolean;

            /**
             * @type {boolean} disabled - 컴포넌트 비활성화여부
             */
            disabled?: boolean;

            /**
             * @type {'x'|'y'|boolean} scrollable - 컴포넌트 스크롤여부
             */
            scrollable?: 'x' | 'y' | boolean;

            /**
             * @type {Dom} $scrollable - 컴포넌트 내부 스크롤되는 DOM 객체
             */
            $scrollable?: Dom;

            /**
             * @type {Admin.Component.Listeners} listeners - 이벤트리스너
             */
            listeners?: Admin.Component.Listeners;
        }
    }

    export class Component extends Admin.Base {
        parent: Admin.Component;
        type: string = 'component';
        role: string = null;

        $component: Dom;
        $container: Dom;
        $top: Dom;
        $content: Dom;
        $bottom: Dom;

        items: Admin.Component[];
        layout: string;
        width: string | number;
        height: string | number;
        padding: string | number;
        margin: string | number;
        style: string;
        class: string;
        hidden: boolean;
        disabled: boolean;
        scrollable: string | boolean;
        $scrollable: Dom;
        scrollbar: Admin.Scrollbar;

        /**
         * 컴포넌트를 생성한다.
         *
         * @param {Object} properties - 객체설정
         */
        constructor(properties: Admin.Component.Properties = null) {
            super(properties);

            this.parent = null;
            this.role = null;
            this.items = null;

            this.layout = this.properties.layout ?? 'auto';
            this.width = this.properties.width ?? null;
            this.height = this.properties.height ?? null;
            this.padding = this.properties.padding ?? null;
            this.margin = this.properties.margin ?? null;
            this.style = this.properties.style ?? null;
            this.class = this.properties.class ?? null;
            this.hidden = this.properties.hidden ?? false;
            this.disabled = this.properties.disabled ?? false;
            this.scrollable = this.properties.scrollable ?? false;

            this.$component = Html.create('div', { 'data-component': this.id, 'tabindex': '-1' });
            this.$container = Html.create('div', { 'data-role': 'container' });
            this.$scrollable = this.$container;
        }

        /**
         * 컴포넌트의 하위 컴포넌트를 정의한다.
         */
        initItems(): void {
            if (this.items === null) {
                this.items = [];
                for (let item of this.properties.items ?? []) {
                    if (item instanceof Admin.Component == true) {
                        this.items.push(item);
                    }
                }
            }

            for (let item of this.items) {
                if (item instanceof Admin.Component) {
                    item.setParent(this);
                    if (this.getLayoutType() == 'column') {
                        item.setLayoutType('column-item');
                    }
                }
            }
        }

        /**
         * 자식 컴포넌트를 처음 위치에 추가한다.
         *
         * @param {Dom} item - 추가할 컴포넌트
         */
        prepend(item: Admin.Component): void {
            if (this.items === null) {
                this.items = [];
            }
            item.setParent(this);

            this.items.unshift(item);

            if (this.isRendered() == true) {
                this.$getContent().prepend(item.$getComponent());
                if (item.isRenderable() == true) {
                    item.render();
                }
            }
        }

        /**
         * 자식 컴포넌트를 추가한다.
         *
         * @param {Admin.Component} item - 추가할 컴포넌트
         * @param {number} position - 추가할 위치 (NULL 인 경우 제일 마지막 위치)
         */
        append(item: Admin.Component, position: number = null): void {
            if (this.items === null) {
                this.items = [];
            }
            item.setParent(this);

            if (position === null || position >= (this.items.length ?? 0)) {
                this.items.push(item);
            } else if (position < 0 && Math.abs(position) >= (this.items.length ?? 0)) {
                this.items.unshift(item);
            } else {
                this.items.splice(position, 0, item);
            }

            if (this.isRendered() == true) {
                this.$getContent().append(item.$getComponent(), position);
                if (item.isRenderable() == true) {
                    item.render();
                }
            }
        }

        /**
         * 레이아웃 형태를 가져온다.
         *
         * @return {string} layout
         */
        getLayoutType(): string {
            return this.layout;
        }

        /**
         * 레이아웃 형태를 지정한다.
         *
         * @param {string} layout
         */
        setLayoutType(layout: string): void {
            this.layout = layout;
        }

        /**
         * 컴포넌트 너비를 설정한다.
         *
         * @param {string|number} width - 너비
         */
        setWidth(width: string | number): void {
            if (width === null) {
                this.width = null;
                this.$component.setStyle('width', null);
                return;
            }

            this.width = typeof width == 'number' ? width + 'px' : width;
            this.$component.setStyle('width', this.width);
        }

        /**
         * 컴포넌트 높이를 설정한다.
         *
         * @param {string|number} height - 높이
         */
        setHeight(height: string | number): void {
            if (height === null) {
                this.height = null;
                this.$component.setStyle('height', null);
                return;
            }

            this.height = typeof height == 'number' ? height + 'px' : height;
            this.$component.setStyle('height', this.height);
        }

        /**
         * 컴포넌트 객체의 최상위 DOM 을 가져온다.
         *
         * @return {Dom} $component
         */
        $getComponent(): Dom {
            return this.$component;
        }

        /**
         * 컴포넌트의 컨테이너 DOM 을 가져온다.
         *
         * @return {Dom} $container
         */
        $getContainer(): Dom {
            return this.$container;
        }

        /**
         * 컴포넌트의 상단 DOM 을 가져온다.
         *
         * @return {Dom} $top
         */
        $getTop(): Dom {
            return this.$top ?? null;
        }

        /**
         * 컴포넌트의 상단 DOM 을 활성화한다.
         *
         * @return {Dom} $top
         */
        $setTop(): Dom {
            if (this.$top == undefined || this.$top == null) {
                this.$top = Html.create('div', { 'data-role': 'top' });

                if (this.isRendered() == true) {
                    this.$getContainer().prepend(this.$top);
                }
            }

            return this.$top;
        }

        /**
         * 컴포넌트의 상단 DOM 을 비활성화한다.
         *
         * @return {Dom} $bottom
         */
        $removeTop(): void {
            if (this.isRendered() == true) {
                this.$top?.remove();
            }
            this.$top = null;
        }

        /**
         * 컴포넌트의 컨텐츠 DOM 을 가져온다.
         *
         * @return {Dom} $content
         */
        $getContent(): Dom {
            this.$content ??= Html.create('div', { 'data-role': 'content' });
            return this.$content;
        }

        /**
         * 컴포넌트의 컨텐츠 DOM 을 재정의한다.
         *
         * @param {Dom} $dom
         */
        $setContent($dom: Dom): Dom {
            if (this.$content !== undefined && this.$content !== null) {
                this.$content.replaceWith($dom);
            }

            this.$content = $dom;
            this.$content.setData('role', 'content');
            return this.$content;
        }

        /**
         * 컴포넌트의 하단 DOM 을 가져온다.
         *
         * @return {Dom} $bottom
         */
        $getBottom(): Dom {
            return this.$bottom ?? null;
        }

        /**
         * 컴포넌트의 하단 DOM 을 활성화한다.
         *
         * @return {Dom} $bottom
         */
        $setBottom(): Dom {
            if (this.$bottom == undefined || this.$bottom == null) {
                this.$bottom = Html.create('div', { 'data-role': 'bottom' });

                if (this.isRendered() == true) {
                    this.$getContainer().append(this.$bottom);
                }
            }

            return this.$bottom;
        }

        /**
         * 컴포넌트의 하단 DOM 을 비활성화한다.
         *
         * @return {Dom} $bottom
         */
        $removeBottom(): void {
            if (this.isRendered() == true) {
                this.$bottom?.remove();
            }
            this.$bottom = null;
        }

        /**
         * 특정 영역에 컴포넌트 DOM을 추가한다.
         *
         * @param {Dom} $target - 추가할 DOM
         * @param {Admin.Component} component - 추가할 컴포넌트
         * @param {number} position - 추가할 위치 (NULL 인 경우 마지막에 위치)
         */
        $addComponent($target: Dom, component: Admin.Component, position: number = null): void {
            if (this.isRendered() == true) {
                $target.append(component.$getComponent(), position);
                component.render();
            }
        }

        /**
         * 스크롤바를 가져온다.
         *
         * @return {Admin.Scrollbar} scrollbar - 스크롤바 (스크롤 되지 않는 컴포넌트인 경우 NULL)
         */
        getScrollbar(): Admin.Scrollbar {
            if (this.scrollbar == undefined) {
                if (this.scrollable === false) {
                    this.scrollbar = null;
                } else {
                    this.scrollbar = Admin.Scrollbar.get(this.$scrollable, this.scrollable);
                }
            }

            return this.scrollbar;
        }

        /**
         * 부모객체를 지정한다.
         *
         * @param {Admin.Component} parent - 부모객체
         * @return {Admin.Component} this
         */
        setParent(parent: Admin.Component): this {
            this.parent = parent;
            return this;
        }

        /**
         * 부모객체를 가져온다.
         *
         * @return {Admin.Component} parent
         */
        getParent(): Admin.Component {
            return this.parent;
        }

        /**
         * 컴포넌트에 해당하는 하위 요소만 가져온다.
         *
         * @return {Admin.Component[]} items - 하위요소
         */
        getItems(): Admin.Component[] {
            if (this.items === null) {
                this.initItems();
            }

            const items: Admin.Component[] = [];

            for (const item of this.items) {
                if (item instanceof Admin.Component) {
                    items.push(item);
                }
            }

            return items;
        }

        /**
         * 특정 인덱스의 하위 컴포넌트를 가져온다.
         *
         * @return {Admin.Component} item - 하위요소
         */
        getItemAt(index: number): Admin.Component {
            return this.getItems().at(index) ?? null;
        }

        /**
         * 컴포넌트를 숨긴다.
         */
        hide(): void {
            this.setHidden(true);

            this.fireEvent('hide', [this]);
        }

        /**
         * 컴포넌트를 보인다.
         */
        show(): void {
            this.setHidden(false);
            this.getScrollbar()?.updatePosition();
            this.fireEvent('show', [this]);
        }

        /**
         * 컴포넌트에 포커스를 설정한다.
         * 키보드 이벤트를 수신하도록 한다.
         */
        focus(): void {
            this.$getComponent().getEl().focus();
        }

        /**
         * 컴포넌트의 숨김여부를 설정한다.
         *
         * @param {boolean} hidden - 숨김여부
         * @return {Admin.Component} this
         */
        setHidden(hidden: boolean): this {
            this.hidden = hidden;

            if (hidden == true) {
                this.$component.hide();
            } else {
                this.$component.show();
                this.render();
            }
            return this;
        }

        /**
         * 컴포넌트의 숨김여부를 가져온다.
         *
         * @return {boolean} is_hidden
         */
        isHidden(): boolean {
            return this.hidden;
        }

        /**
         * 컴포넌트의 보임여부를 가져온다.
         *
         * @return {boolean} is_show
         */
        isShow(): boolean {
            return this.isRendered() == true && this.isHidden() == false;
        }

        /**
         * 컴포넌트를 비활성화한다.
         */
        disable(): void {
            this.setDisabled(true);
        }

        /**
         * 컴포넌트를 활성화한다.
         */
        enable(): void {
            this.setDisabled(false);
        }

        /**
         * 컴포넌트의 비활성화여부를 설정한다.
         * 하위 컴포넌트 클래스에서 처리한다.
         *
         * @param {boolean} disabled - 비활성여부
         * @return {Admin.Component} this
         */
        setDisabled(disabled: boolean): this {
            this.disabled = disabled;
            return this;
        }

        /**
         * 컴포넌트의 비활성여부를 가져온다.
         * 하위 컴포넌트 클래스에서 처리한다.
         *
         * @return {boolean} is_hidden
         */
        isDisabled(): boolean {
            return this.disabled;
        }

        /**
         * 컴포넌트가 렌더링이 가능한지 여부를 가져온다.
         *
         * @return {boolean} is_renderable
         */
        isRenderable(): boolean {
            if (this.isRendered() == false && this.isHidden() == true) {
                this.$getComponent().hide();
            }
            return this.isHidden() == false && this.isRendered() == false;
        }

        /**
         * 컴포넌트의 랜더링여부를 가져온다.
         *
         * @return {boolean} is_rendered
         */
        isRendered(): boolean {
            return this.$component.getData('rendered') === true;
        }

        /**
         * 컴포넌트가 랜더링되었는지 기록한다.
         * 상위 클래스에 의해 더이상 컴포넌트가 랜더링되지 않도록 한다.
         */
        rendered(): void {
            this.$component.setData('rendered', true, false);
        }

        /**
         * 컴포넌트 상단 컨텐츠를 랜더링한다.
         */
        renderTop(): void {}

        /**
         * 컴포넌트 컨텐츠를 랜더링한다.
         */
        renderContent(): void {
            this.renderItems();
        }

        /**
         * 컴포넌트 하단 컨텐츠를 랜더링한다.
         */
        renderBottom(): void {}

        /**
         * 컴포넌트에 속한 아이템을 랜더링한다.
         */
        renderItems(): void {
            for (let item of this.getItems()) {
                this.$getContent().append(item.$getComponent());
                if (item.isRenderable() == true) {
                    item.render();
                }
            }
        }

        /**
         * 레이아웃을 렌더링한다.
         */
        render(): void {
            this.initItems();
            this.$getComponent().setData('type', this.type).setData('role', this.role).addClass(this.layout);

            if (this.width !== null) {
                this.setWidth(this.width);
            }

            if (this.height !== null) {
                this.setHeight(this.height);
            }

            if (this.hidden == true) {
                this.$getComponent().hide();
            }

            if (this.class !== null) {
                this.$getComponent().addClass(...this.class.split(' '));
            }

            if (this.isRenderable() == true) {
                this.$getComponent().append(this.$container);

                if (this.$getTop() != null) {
                    this.$getContainer().append(this.$getTop());
                    this.renderTop();
                }

                this.$getContainer().append(this.$getContent());
                this.renderContent();

                if (this.$getBottom() != null) {
                    this.$getContainer().append(this.$getBottom());
                    this.renderBottom();
                }

                if (this.isRendered() == false) {
                    this.rendered();
                    this.onRender();
                }
            }

            if (this.isRendered() == true) {
                if (this.disabled == true) {
                    this.disable();
                }

                if (this.getLayoutType() == 'column') {
                    if (this.properties.gap !== undefined && this.properties.gap > 0) {
                        this.$getContent().setStyle('column-gap', this.properties.gap + 'px');
                    }
                }

                if (this.getLayoutType() == 'column-item') {
                    if (this.properties.flex !== undefined && this.properties.flex > 0) {
                        this.$getComponent().setStyle('flex', this.properties.flex);
                        this.$getComponent().setStyle('flex-shrink', 0);

                        if (this.properties.minWidth !== undefined && this.properties.minWidth > 0) {
                            this.$getComponent().setStyle('min-width', this.properties.minWidth + 'px');
                        }
                    } else {
                        if (this.properties.width !== undefined) {
                            this.$getComponent().setStyle('width', this.properties.width + 'px');
                            this.$getComponent().setStyle('flex-grow', 0);
                            this.$getComponent().setStyle('flex-shrink', 0);
                        }
                    }
                }

                this.getScrollbar()?.render();
            }

            if (this.padding !== null) {
                if (typeof this.padding == 'number') {
                    this.padding = this.padding + 'px';
                }
                this.$getContent().setStyle('padding', this.padding);
            }

            if (this.margin !== null) {
                if (typeof this.margin == 'number') {
                    this.margin = this.margin + 'px';
                }
                this.$getComponent().setStyle('padding', this.margin);
            }
        }

        /**
         * 컴포넌트를 제거한다.
         */
        remove(): void {
            if (Array.isArray(this.items) == true) {
                this.items.forEach((item: Admin.Component) => {
                    item.remove();
                });
            }
            this.scrollbar?.remove();
            this.$component.remove();
            super.remove();
        }

        /**
         * 특정 아이템을 제거한다.
         */
        removeItem(index: number): void {
            if (this.getItemAt(index) !== null) {
                this.getItemAt(index).remove();
                this.items = this.items.splice(index, 1);
            }
        }

        /**
         * 하위 컴포넌트를 모두 제거한다.
         */
        empty(): void {
            if (Array.isArray(this.items) == true) {
                this.items.forEach((item: Admin.Component) => {
                    item.remove();
                });

                this.items = [];
            }

            if (this.isRendered() == true) {
                this.$getContent().empty();
                this.renderContent();
            }
        }

        /**
         * 현재 컴포넌트가 화면상에 출력되었을 때 이벤트를 처리한다.
         */
        onRender(): void {
            this.fireEvent('render', [this]);
        }
    }
}
