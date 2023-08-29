import reactDOMConfig from './react-dom.config';
import reactConfig from './react.config';
import ReactNoopRenderer from './react-noop-renderer.config';

export default () => {
	return [...reactConfig, ...reactDOMConfig, ...ReactNoopRenderer];
};
