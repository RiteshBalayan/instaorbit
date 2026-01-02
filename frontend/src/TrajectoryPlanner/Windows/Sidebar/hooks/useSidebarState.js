import { useSelector } from 'react-redux';

export const useSidebarState = () => {
  const view = useSelector((state) => state.view);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);

  return {
    view,
    referenceSystem,
  };
};

export default useSidebarState;
