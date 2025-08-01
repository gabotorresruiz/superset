/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { render, screen } from '@superset-ui/core/spec';
import '@testing-library/jest-dom';
import NoResultsComponent from '../../../src/chart/components/NoResultsComponent';

const renderNoResultsComponent = () =>
  render(<NoResultsComponent height="400" width="300" />);

test('renders the no results error', () => {
  renderNoResultsComponent();

  expect(screen.getByText(/No Results/)).toBeInTheDocument();
  expect(
    screen.getByText(
      'No results were returned for this query. If you expected results to be returned, ensure any filters are configured properly and the datasource contains data for the selected time range.',
    ),
  ).toBeInTheDocument();
});
