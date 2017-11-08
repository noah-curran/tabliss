import * as React from 'react';
import { ActionCreator, connect } from 'react-redux';
import { Action, popPending, pushPending, RootState } from '../../../../data';
import { getImage } from './api';
import { defaultProps, UNSPLASH_UTM } from './constants';
import { Image, Settings } from './interfaces';
import './Unsplash.sass';
const get = require('lodash/get');
const debounce = require('lodash/debounce');
const playIcon = require('feather-icons/dist/icons/play.svg');
const pauseIcon = require('feather-icons/dist/icons/pause.svg');

interface Props extends Settings {
  darken: boolean;
  focus: boolean;
  local: State;
  popPending: ActionCreator<Action>;
  pushPending: ActionCreator<Action>;
  updateLocal: (state: Partial<State>) => void;
}

interface State {
  current?: Image & { src?: string };
  next?: Image;
  paused?: boolean;
}

class Unsplash extends React.PureComponent<Props, State> {
  static defaultProps: Partial<Props> = defaultProps;
  state: State = {};
  private refreshDebounced = debounce(this.refresh, 250);

  componentWillMount() {
    // Get image from local cache
    const image = get(this.props, 'local.next');

    if (image && image.data instanceof Blob) {
      this.setCurrentImage(image);
    } else {
      this.fetchImage().then(this.setCurrentImage);
    }

    // Fetch the next image and load into cache (if not paused)
    if (! get(this.props, 'local.paused')) {
      this.fetchImage().then(next => {
        if (! get(this.props, 'local.paused')) {
          this.setNextImage(next);
        }
      });
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.by !== this.props.by || nextProps.featured !== this.props.featured) {
      this.refreshDebounced.cancel();
      this.refresh(nextProps);
    }

    if (nextProps.search !== this.props.search || nextProps.collections !== this.props.collections) {
      this.refreshDebounced(nextProps);
    }
  }

  render() {
    const styles = this.state.current
      ? { backgroundImage: `url(${this.state.current.src})` }
      : { opacity: 0 };

    return (
      <div className="Unsplash fullscreen" style={styles}>
        {this.props.darken && ! this.props.focus && <div className="darken fullscreen" />}

        {this.state.current && (
          <div className="credit">
            <span style={{float: 'right'}}>
              {this.state.current.location_title}
              &emsp;
              {get(this.props, 'local.paused')
                ? <a onClick={this.play} title="Resume new images">
                    <i dangerouslySetInnerHTML={{ __html: playIcon }} />
                  </a>
                : <a onClick={this.pause} title="Pause on this image">
                    <i dangerouslySetInnerHTML={{ __html: pauseIcon }} />
                  </a>
              }
            </span>

            <a
              href={this.state.current.image_link + UNSPLASH_UTM}
              rel="noopener noreferrer"
              target="_blank"
            >
              Photo
            </a>
            {' by '}
            <a
              href={this.state.current.user_link + UNSPLASH_UTM}
              rel="noopener noreferrer"
              target="_blank"
            >
              {this.state.current.user_name}
            </a>
            {' / '}
            <a
              href={'https://unsplash.com/' + UNSPLASH_UTM}
              rel="noopener noreferrer"
              target="_blank"
            >
              Unsplash
            </a>
          </div>
        )}
      </div>
    );
  }

  /**
   * Pause on current image.
   *
   * @type {void}
   */
  private pause = () => {
    this.props.updateLocal({ paused: true });
    this.setNextImage(this.state.current as Image);
  }

  /**
   * Resume image rotation.
   *
   * @type {void}
   */
  private play = () => {
    this.props.updateLocal({ paused: false });
    this.fetchImage().then(this.setNextImage);
  }

  /**
   * Set the current image.
   *
   * @type {void}
   */
  private setCurrentImage = (image: Image) => {
    const src = URL.createObjectURL(image.data);
    const current = { ...image, src };

    this.setState({ current });
  }

  /**
   * Set the next image.
   *
   * @type {void}
   */
  private setNextImage = (next: Image) => {
    this.props.updateLocal({ next });
  }

  /**
   * Refresh current and next images.
   * (when settings update, for instance)
   *
   * @type {void}
   */
  private refresh(props: Props) {
    this.fetchImage(props).then(this.setCurrentImage);
    this.fetchImage(props).then(this.setNextImage);
  }

  /**
   * Fetch an image from the Unsplash API.
   *
   * @type {Promise<Image>}
   */
  private fetchImage(props: Props = this.props) {
    return getImage(
      props,
      this.props.pushPending,
      this.props.popPending,
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { focus: state.ui.focus };
};

const mapDispatchToProps = { popPending, pushPending };

export default connect(mapStateToProps, mapDispatchToProps)(Unsplash);
